import { BaseBlock } from "@archivisio/c4-modelizer-sdk";
import TechnologyIcon from "@components/TechnologyIcon";
import { getTechnologyById, Technology } from "@data/technologies";
import { styled } from "@mui/system";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import React, { useState } from "react";
import ReactDOM from "react-dom";

const ICON_SIZE = 18;

const EdgeLabelContainer = styled("div")(() => ({
  position: "absolute",
  transform: "translate(-50%, -50%)",
  pointerEvents: "all",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 40,
  minHeight: 24,
  zIndex: 1,
}));

const EdgeLabel = styled("span")(() => ({
  marginTop: 2,
  background: "rgba(255,255,255,0.95)",
  borderRadius: 4,
  padding: "1px 6px",
  fontSize: 12,
  fontWeight: 500,
  color: "#333",
  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  border: "1px solid #eee",
  maxWidth: 160,
  wordBreak: "break-word",
  textAlign: "center",
  display: "inline-block",
}));

const createEdgeStyle = (
  style: React.CSSProperties | undefined,
  isBidirectional: boolean,
  technology: Technology | undefined
) => ({
  ...style,
  animation: isBidirectional ? "none" : style?.animation,
  stroke: technology?.color,
});

function cubicBezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
) {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

const TechnologyEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  ...props
}) => {
  const isBidirectional = props.data?.bidirectional === true;
  const description = props.data?.description as string | undefined;
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const edgePathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

  const [edgePath] = getBezierPath(edgePathParams);
  const technology = props.data?.technologyId
    ? getTechnologyById(props.data.technologyId as string)
    : undefined;

  const labelPosition =
    typeof props.data?.labelPosition === "number"
      ? props.data.labelPosition
      : 50;
  const t = Math.max(0, Math.min(1, labelPosition / 100));
  let bezierX = 0,
    bezierY = 0;

  const bezierMatch = edgePath.match(
    /M\s*([\d.eE+-]+),([\d.eE+-]+)\s*C\s*([\d.eE+-]+),([\d.eE+-]+)\s+([\d.eE+-]+),([\d.eE+-]+)\s+([\d.eE+-]+),([\d.eE+-]+)/
  );
  if (bezierMatch) {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = bezierMatch
      .slice(1, 9)
      .map(Number);
    bezierX = cubicBezierPoint(t, x1, x2, x3, x4);
    bezierY = cubicBezierPoint(t, y1, y2, y3, y4);
  }

  // {markerEnd: "url('#1__color=#51a2ff&height=18&type=arrowclosed&width=18')"}markerEnd: "url('#1__color=#51a2ff&height=18&type=arrowclosed&width=18')"[[Prototype]]: Object

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={isBidirectional ? markerStart : undefined}
        markerEnd={markerEnd}
        style={createEdgeStyle(style, isBidirectional, technology)}
      />

      {/* Wide invisible path so the whole arrow line is hoverable */}
      {description && (
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          onMouseEnter={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setTooltipPos(null)}
          style={{ cursor: "default" }}
        />
      )}

      <EdgeLabelRenderer>
        <EdgeLabelContainer
          style={{
            transform: `translate(-50%, -50%) translate(${bezierX}px,${bezierY}px)`,
          }}
          className="nodrag nopan"
        >
          <TechnologyIcon
            item={props.data as unknown as BaseBlock}
            size={ICON_SIZE}
            showTooltip={true}
          />
          {props.label && (
            <EdgeLabel
              style={{
                color: technology?.color,
              }}
            >
              {props.label}
            </EdgeLabel>
          )}
        </EdgeLabelContainer>
      </EdgeLabelRenderer>

      {/* Description tooltip — portalled to body so it escapes the SVG */}
      {tooltipPos && description && ReactDOM.createPortal(
        <div
          style={{
            position: "fixed",
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 12,
            background: "rgba(5, 25, 55, 0.97)",
            border: "1px solid rgba(81, 162, 255, 0.35)",
            borderRadius: 7,
            padding: "8px 12px",
            maxWidth: 300,
            fontSize: 13,
            color: "#cce4ff",
            lineHeight: 1.55,
            boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            zIndex: 99999,
            backdropFilter: "blur(6px)",
            wordBreak: "break-word",
          }}
        >
          {props.label && (
            <div
              style={{
                fontWeight: 600,
                color: technology?.color ?? "#51a2ff",
                marginBottom: 5,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {props.label as string}
            </div>
          )}
          <div>{description}</div>
        </div>,
        document.body
      )}
    </>
  );
};

export default TechnologyEdge;
