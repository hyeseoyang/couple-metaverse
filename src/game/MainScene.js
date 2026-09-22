import Phaser from 'phaser';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const SPEED = 160;
const SYNC_INTERVAL_MS = 100; // 내 위치를 100ms마다 Firestore에 전송 (너무 잦은 쓰기 방지)

// 스프라이트시트 레이아웃: 32x32 프레임, 2열(0=정지,1=걷기) x 3행(0=아래,1=위,2=옆)
const FRAME = { down: 0, up: 2, side: 4 }; // 각 방향의 "정지" 프레임 번호(첫 프레임)

function hexToInt(hex, fallback) {
    if (!hex) return fallback;
    const parsed = parseInt(hex.replace('#', ''), 16);
    return Number.isNaN(parsed) ? fallback : parsed;
}

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    init({ coupleId, myUid, partnerUid, myColor, partnerColor }) {
        this.coupleId = coupleId;
        this.myUid = myUid;
        this.partnerUid = partnerUid;
        this.myTint = hexToInt(myColor, 0x4f8cff);
        this.partnerTint = hexToInt(partnerColor, 0xff6fa5);
    }

    preload() {
        // public/assets/avatar.png 를 스프라이트시트로 불러오기
        this.load.spritesheet('avatar', 'assets/avatar.png', {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create() {
        // --- 임시 배경: 실제 타일맵으로 나중에 교체 가능 ---
        this.add.rectangle(400, 300, 800, 600, 0xf3ead6); // 방 바닥
        this.add.rectangle(400, 60, 800, 20, 0xb08968); // 벽(위)

        // 걷기/정지 애니메이션 등록 (한 번만)
        this.createAnimIfMissing('walk-down', [0, 1]);
        this.createAnimIfMissing('walk-up', [2, 3]);
        this.createAnimIfMissing('walk-side', [4, 5]);

        // --- 내 아바타 ---
        this.myAvatar = this.physics.add.sprite(400, 400, 'avatar', FRAME.down);
        this.myAvatar.setTint(this.myTint);
        this.myAvatar.setCollideWorldBounds(true);
        this.myAvatar.setSize(14, 16).setOffset(9, 14); // 몸통 크기에 맞춘 충돌 박스
        this.myDir = 'down';

        this.add.text(400, 375, '나', { fontSize: '14px', color: '#333' }).setOrigin(0.5);

        // --- 상대 아바타 ---
        this.partnerAvatar = this.add.sprite(400, 200, 'avatar', FRAME.down);
        this.partnerAvatar.setTint(this.partnerTint);
        this.partnerDir = 'down';
        this.partnerLastPos = { x: 400, y: 200 };

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');

        this.physics.world.setBounds(0, 80, 800, 520);

        // 상대방 위치 실시간 구독
        this.unsubscribePartner = onSnapshot(
            doc(db, 'couples', this.coupleId, 'positions', this.partnerUid),
            (snap) => {
                if (!snap.exists()) return;
                const { x, y } = snap.data();
                this.updatePartnerDirection(x, y);

                this.tweens.add({
                    targets: this.partnerAvatar,
                    x,
                    y,
                    duration: SYNC_INTERVAL_MS,
                    ease: 'Linear',
                });
            }
        );

        this.lastSync = 0;

        this.events.once('shutdown', () => {
            if (this.unsubscribePartner) this.unsubscribePartner();
        });
    }

    createAnimIfMissing(key, frames) {
        if (this.anims.exists(key)) return;
        this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers('avatar', { frames }),
            frameRate: 4,
            repeat: -1,
        });
    }

    // 이동 방향에 따라 애니메이션/좌우 반전 갱신
    setAvatarDirection(sprite, dir, flipX, moving) {
        if (moving) {
            const animKey = dir === 'left' || dir === 'right' ? 'walk-side' : `walk-${dir}`;
            if (sprite.anims.currentAnim?.key !== animKey || !sprite.anims.isPlaying) {
                sprite.play(animKey);
            }
        } else {
            sprite.anims.stop();
            const dirKey = dir === 'left' || dir === 'right' ? 'side' : dir;
            sprite.setFrame(FRAME[dirKey]);
        }
        sprite.setFlipX(flipX);
    }

    updatePartnerDirection(x, y) {
        const dx = x - this.partnerLastPos.x;
        const dy = y - this.partnerLastPos.y;
        const moving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;

        if (moving) {
            let dir, flipX;
            if (Math.abs(dx) > Math.abs(dy)) {
                dir = dx > 0 ? 'right' : 'left';
                flipX = dir === 'left';
            } else {
                dir = dy > 0 ? 'down' : 'up';
                flipX = false;
            }
            this.partnerDir = dir;
            this.setAvatarDirection(this.partnerAvatar, dir, flipX, true);
        } else {
            this.setAvatarDirection(this.partnerAvatar, this.partnerDir, this.partnerAvatar.flipX, false);
        }

        this.partnerLastPos = { x, y };
    }

    update(time) {
        const body = this.myAvatar.body;
        body.setVelocity(0);

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        if (left) body.setVelocityX(-SPEED);
        else if (right) body.setVelocityX(SPEED);

        if (up) body.setVelocityY(-SPEED);
        else if (down) body.setVelocityY(SPEED);

        body.velocity.normalize().scale(body.velocity.length() > 0 ? SPEED : 0);

        // 내 아바타 방향/애니메이션 갱신 (우선순위: 좌우 > 상하)
        const moving = left || right || up || down;
        if (left) {
            this.myDir = 'left';
            this.setAvatarDirection(this.myAvatar, 'left', true, true);
        } else if (right) {
            this.myDir = 'right';
            this.setAvatarDirection(this.myAvatar, 'right', false, true);
        } else if (up) {
            this.myDir = 'up';
            this.setAvatarDirection(this.myAvatar, 'up', false, true);
        } else if (down) {
            this.myDir = 'down';
            this.setAvatarDirection(this.myAvatar, 'down', false, true);
        } else {
            this.setAvatarDirection(this.myAvatar, this.myDir, this.myAvatar.flipX, false);
        }

        // 주기적으로 내 위치를 Firestore에 저장 (throttle)
        if (time - this.lastSync > SYNC_INTERVAL_MS) {
            this.lastSync = time;
            setDoc(doc(db, 'couples', this.coupleId, 'positions', this.myUid), {
                x: Math.round(this.myAvatar.x),
                y: Math.round(this.myAvatar.y),
                updatedAt: Date.now(),
            }).catch(() => {
                /* 네트워크 순간 오류는 다음 tick에서 재시도되므로 무시 */
            });
        }
    }
}
