import React from "react";
import { CircleCheck, Loader, Pause, RedoDot, XCircle } from "lucide-react";

const TaskStatus = ({ file, checkKey, skip = false }) => {
  if (skip) return <RedoDot className="size-4" />;
  if (file[checkKey] === "loading") {
    return <Loader className="animate-spin" />;
  }
  if (file[checkKey] === "done") {
    return <CircleCheck className="size-4" />;
  }
  if (file[checkKey] === "error") {
    return <XCircle className="size-4 text-red-500" />;
  }
  return <Pause className="size-4" />;
};

export default TaskStatus;
