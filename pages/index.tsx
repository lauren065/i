// pages/index.tsx
import { useRef, useState } from "react";

export default function I() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 플래시 상태 관리
  const [flash, setFlash] = useState(false);

  const handleClick = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/assets/this summer.wav");
    }

    if (audioRef.current.paused) {
      // 현재 멈춰있다면 재생
      audioRef.current.play().then(() => {
        // 재생 직후 #00FFDD로 반짝이도록 flash=true
        setFlash(true);
        setTimeout(() => setFlash(false), 300); // 0.1초 후 원상복귀
      });
    } else {
      // 재생 중이라면 정지
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // 매번 처음부터 듣고 싶다면 유지
    }
  };

  return (
    <>
      <style jsx>{`
        /* 깜박이는 애니메이션 */
        @keyframes blink144 {
          0%,
          100% {
            color: #ffffff;
          }
          50% {
            color: #cccccc;
          }
        }

        .blink-text {
          display: inline-block;
          padding: 20px 100px;
          animation: blink144 832ms infinite; /* 144BPM → ~416ms 간격으로 깜빡 */
          cursor: pointer;
        }

        /* 재생할 때 잠시 반짝이는 효과 */
        .flash {
          animation: none; /* 깜박임 해제 */
          color: #ffffff !important;
        }

        .container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100dvh; /* 모바일 최신 브라우저의 실제 뷰포트 높이 */
        }
      `}</style>

      <div className="container">
        <span
          onClick={handleClick}
          // flash가 true면 .flash 클래스를 추가, 아니면 기본 .blink-text 유지
          className={`blink-text ${flash ? "flash" : ""}`}
        >
          <img src="/assets/2025.png" alt="2025" width={30} />
        </span>
      </div>
    </>
  );
}
