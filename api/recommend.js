// Vercel 서버리스 함수. 브라우저가 아니라 서버에서 실행되므로
// OPENAI_API_KEY가 브라우저에 노출되지 않는다.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: '서버에 OPENAI_API_KEY가 설정되어 있지 않습니다.' });
  }

  const { region, budget, time, preferences } = req.body || {};
  if (!region || !time) {
    return res.status(400).json({ error: '지역과 시간은 필수 입력값입니다.' });
  }

  const userPrompt = `
지역: ${region}
예산: ${budget || '미정 (적당히 알아서)'}
데이트 가능 시간: ${time}
선호 활동/취향: ${preferences || '특별히 없음, 무난하게 추천'}

위 조건에 맞는 커플 데이트 코스를 짜줘.
`.trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              '너는 커플 데이트 코스를 추천해주는 친절한 데이트 플래너야. ' +
              '입력받은 지역, 예산, 시간, 선호 활동을 바탕으로 시간 순서대로 ' +
              '이동 동선이 자연스러운 데이트 코스를 3~5단계로 짜줘. ' +
              '각 단계는 "1. [시간대] 장소/활동 - 짧은 설명" 형식의 번호 목록으로, ' +
              '한국어로, 실제 존재할 법한 장소 유형으로 답해. ' +
              '너무 길게 쓰지 말고 단계별로 간결하게 써줘.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `AI 호출 실패: ${errText}` });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: '추천 생성 중 오류가 발생했습니다.' });
  }
}
