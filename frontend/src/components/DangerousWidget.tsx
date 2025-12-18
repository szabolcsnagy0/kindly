import React from "react";

interface Props {
  htmlContent: string;
}

export const DangerousWidget: React.FC<Props> = ({ htmlContent }) => {
  const MAX_HEIGHT = 500;

  return (
    <div style={{ maxHeight: MAX_HEIGHT, overflow: "auto" }}>
      <h3>Widget Content</h3>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
};
