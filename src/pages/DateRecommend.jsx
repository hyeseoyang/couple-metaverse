import { useState } from 'react';

export default function DateRecommend() {
  const [region, setRegion] = useState('');
  const [budget, setBudget] = useState('');
  const [time, setTime] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, budget, time, preferences }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '추천을 받아오지 못했어요.');
      } else {
        setResult(data.result);
      }
    } catch (err) {
      setError('네트워크 오류로 추천을 받아오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="date-recommend">
      <form className="date-form" onSubmit={handleSubmit}>
        <label>
          지역
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="예: 강남, 홍대, 부산 서면"
            required
          />
        </label>
        <label>
          예산
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="예: 5만원 이내 (비워두면 알아서 추천)"
          />
        </label>
        <label>
          데이트 가능 시간
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="예: 토요일 오후 1시~6시"
            required
          />
        </label>
        <label>
          선호 활동 / 취향
          <input
            type="text"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="예: 카페 좋아함, 매운 음식 못 먹음, 실내 위주"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? '코스 짜는 중...' : '✨ 데이트 코스 추천받기'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="date-result">
          <h3>추천 데이트 코스</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
