import { useState } from "react";
/** 候補の画像を順に試し、どれも読めなければ何も出さない */
export default function FallbackImg({ srcs, className = "", alt = "" }: { srcs: string[]; className?: string; alt?: string }) {
  const [i, setI] = useState(0);
  if (i >= srcs.length) return null;
  return <img key={srcs[i]} src={srcs[i]} alt={alt} onError={() => setI(i + 1)} className={className} draggable={false} />;
}
