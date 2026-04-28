import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { NodeResizer, NodeProps, ResizeParams } from "@xyflow/react";
import React, { useEffect, useRef, useState } from "react";
import { useGroupStore } from "@stores/groupStore";

interface GroupData {
  label: string;
  color: string;
  onDelete?: (id: string) => void;
}

const GroupBlock: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { label, color, onDelete } = data as unknown as GroupData;
  const { updateGroup } = useGroupStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label as string);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(label as string);
  }, [label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      updateGroup(id, { label: trimmed });
    } else {
      setEditValue(label as string);
    }
    setIsEditing(false);
  };

  const handleResizeEnd = (_: unknown, params: ResizeParams) => {
    updateGroup(id, {
      position: { x: params.x, y: params.y },
      width: params.width,
      height: params.height,
    });
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(81,162,255,${alpha})`;
    return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
  };

  const borderColor = (color as string) || "#51a2ff";

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={120}
        onResizeEnd={handleResizeEnd}
        lineStyle={{ border: `1.5px solid ${borderColor}` }}
        handleStyle={{
          width: 10,
          height: 10,
          border: `2px solid ${borderColor}`,
          background: "#0a1929",
          borderRadius: 2,
        }}
      />

      {/* Background fill */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: hexToRgba(borderColor, 0.06),
          border: `1.5px solid ${hexToRgba(borderColor, selected ? 0.7 : 0.35)}`,
          borderRadius: 8,
          boxShadow: selected
            ? `0 0 0 1px ${hexToRgba(borderColor, 0.4)}, inset 0 0 20px ${hexToRgba(borderColor, 0.04)}`
            : `inset 0 0 20px ${hexToRgba(borderColor, 0.04)}`,
          backdropFilter: "blur(2px)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Label bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 8px 4px 10px",
            background: hexToRgba(borderColor, 0.12),
            borderBottom: `1px solid ${hexToRgba(borderColor, 0.2)}`,
            borderRadius: "6px 6px 0 0",
            minHeight: 30,
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onDoubleClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditValue(label as string);
                  setIsEditing(false);
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: borderColor,
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.5px",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
          ) : (
            <Typography
              variant="caption"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              style={{
                color: borderColor,
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                cursor: "text",
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              {(label as string) || "Group"}
            </Typography>
          )}

          {(selected || !label) && onDelete && (
            <Tooltip title="Delete group" arrow>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                style={{
                  color: borderColor,
                  padding: 2,
                  opacity: 0.7,
                }}
              >
                <DeleteOutlineIcon style={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};

export default GroupBlock;
