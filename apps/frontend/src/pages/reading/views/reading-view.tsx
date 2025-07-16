import { useEffect } from "react";

export default function ReadingView() {
  useEffect(() => {
    console.log("ReadingView");
  }, []);

  return <div>ReadingView</div>;
}