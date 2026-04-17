// pages/api/image.ts

import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import ID3 from "node-id3";
import fs from "fs";

// 주어진 오디오 파일의 이미지 데이터를 제공하는 API 핸들러
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 쿼리 문자열에서 파일 파라미터를 가져옴
  const { file } = req.query;

  if (typeof file !== "string") {
    res.status(400).json({ error: "Invalid file parameter" });
    return;
  }

  // 오디오 파일의 전체 경로 구성
  const filePath = path.join(process.cwd(), "public", "assets", "studio", file);

  // 파일 존재 여부 확인
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  // 오디오 파일에서 ID3 태그 읽기
  const tags = ID3.read(filePath);

  // 이미지 데이터가 있는지 확인
  if (tags.image && typeof tags.image !== "string" && tags.image.imageBuffer) {
    const base64String = Buffer.from(tags.image.imageBuffer).toString("base64");
    const mimeType = tags.image.mime || "image/jpeg";
    const imageUrl = `data:${mimeType};base64,${base64String}`;

    // 이미지 데이터를 JSON으로 반환
    res.status(200).json({ imageUrl });
  } else {
    res.status(404).json({ error: "Image not found" });
  }
}
