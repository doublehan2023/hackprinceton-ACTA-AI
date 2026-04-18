export async function analyzeCTA(text: string, filename: string, gemini_key?: string) {
  const res = await fetch("http://localhost:8000/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filename,
      text,
      gemini_key
    })
  });

  if (!res.ok) throw new Error("Analyze failed");

  return res.json();
}