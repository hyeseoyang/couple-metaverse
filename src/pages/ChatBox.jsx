import { useEffect, useRef, useState } from 'react';
import { subscribeToMessages, sendMessage } from '../firebase/chat';

export default function ChatBox({ coupleId, myUid }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(coupleId, setMessages);
    return unsubscribe;
  }, [coupleId]);

  // 새 메시지가 오면 항상 맨 아래로 스크롤
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(coupleId, myUid, text);
    setText('');
  };

  return (
    <div className="chat-box">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-empty">아직 메시지가 없어요. 첫 인사를 남겨보세요!</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.senderId === myUid ? 'mine' : 'theirs'}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={500}
        />
        <button type="submit">전송</button>
      </form>
    </div>
  );
}
