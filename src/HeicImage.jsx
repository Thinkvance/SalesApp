// HeicImage.jsx
import React, { useEffect, useState } from "react";
import heic2any from "heic2any";

export default function HeicImage({ src, alt, className }) {
  const [converted, setConverted] = useState(null);

  useEffect(() => {
    if (!src) return;
    if (!src.toLowerCase().endsWith(".heic")) {
      setConverted(src);
      return;
    }

    // Convert HEIC → JPEG
    fetch(src)
      .then((res) => res.blob())
      .then((blob) =>
        heic2any({ blob, toType: "image/jpeg" }).then((out) =>
          setConverted(URL.createObjectURL(out))
        )
      )
      .catch((err) => {
        console.error("HEIC conversion failed:", err);
        setConverted(src); // fallback
      });
  }, [src]);

  if (!converted) return <p className="text-gray-400">Loading image...</p>;
  return (
    <a
      href={converted}
      //   key={imgIndex}
      target="_blank"
      rel="noopener noreferrer"
      className="w-fit"
    >
      <div className="bg-white border rounded-lg shadow-md overflow-hidden">
        <img src={converted} alt={alt} className={className} />
      </div>
    </a>
  );
}
