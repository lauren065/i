// pages/api/visitor.js

import { NextApiRequest, NextApiResponse } from "next";
import { promises as fsPromises } from "fs";
import path from "path";

type Counts = {
  totalVisitors: number;
  visitors: { [key: string]: Set<string> };
};

type CountsJSON = {
  totalVisitors: number;
  visitors: { [key: string]: string[] };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 클라이언트의 IP 주소를 가져오는 함수
  const getClientIp = (req: NextApiRequest): string | null => {
    let ip =
      (req.headers["x-forwarded-for"] as string) ||
      req.socket?.remoteAddress ||
      null;

    if (ip) {
      ip = ip.split(",")[0].trim();
    }

    return ip;
  };

  let ip = getClientIp(req) || "";

  // IP 주소를 익명화하기 위해 IPv4의 앞 두 옥텟만 사용
  if (ip.includes(".")) {
    const ipParts = ip.split(".");
    ip = `${ipParts[0]}.${ipParts[1]}`;
  } else if (ip.includes(":")) {
    ip = ip.split(":")[0];
  }

  const countsFilePath = path.join(process.cwd(), "counts.json");
  let counts: Counts = { totalVisitors: 0, visitors: {} };

  try {
    await fsPromises.access(countsFilePath);
    const countsData = await fsPromises.readFile(countsFilePath, "utf-8");
    const countsJSON = JSON.parse(countsData) as CountsJSON;

    counts = {
      totalVisitors: countsJSON.totalVisitors,
      visitors: {},
    };

    for (const date in countsJSON.visitors) {
      counts.visitors[date] = new Set(countsJSON.visitors[date]);
    }
  } catch (err) {
    counts = { totalVisitors: 0, visitors: {} };
  }

  const today = new Date().toISOString().split("T")[0];

  if (!counts.visitors[today]) {
    counts.visitors[today] = new Set();
  }

  if (!counts.visitors[today].has(ip)) {
    counts.visitors[today].add(ip);
    counts.totalVisitors += 1;

    // counts.visitors의 각 Set을 Array로 변환하여 JSON으로 저장합니다.
    const visitorsToSave: { [key: string]: string[] } = {};
    for (const date in counts.visitors) {
      visitorsToSave[date] = Array.from(counts.visitors[date]);
    }

    await fsPromises.writeFile(
      countsFilePath,
      JSON.stringify(
        { totalVisitors: counts.totalVisitors, visitors: visitorsToSave },
        null,
        2
      )
    );
  }

  const todayVisitors = counts.visitors[today].size;

  res.status(200).json({
    ip: ip,
    todayVisits: todayVisitors,
    totalVisits: counts.totalVisitors,
  });
}
