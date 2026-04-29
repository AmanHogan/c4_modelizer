import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { styled } from "@mui/system";
import React, { useEffect, useRef, useState } from "react";
import { ProjectSnapshot } from "@stores/projectStore";

const SIDEBAR_WIDTH = 220;

const SidebarRoot = styled(Box)(() => ({
  width: SIDEBAR_WIDTH,
  minWidth: SIDEBAR_WIDTH,
  height: "100vh",
  background: "linear-gradient(180deg, #051937 0%, #021120 100%)",
  borderRight: "1px solid rgba(81, 162, 255, 0.15)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  flexShrink: 0,
}));

const SidebarHeader = styled(Box)(() => ({
  padding: "16px 12px 10px 14px",
  borderBottom: "1px solid rgba(81, 162, 255, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
}));

const HeaderTitle = styled(Typography)(() => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  color: "rgba(81, 162, 255, 0.7)",
}));

const ProjectList = styled(Box)(() => ({
  flex: 1,
  overflowY: "auto",
  padding: "6px 0",
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    background: "rgba(81, 162, 255, 0.2)",
    borderRadius: 2,
  },
}));

const ProjectItem = styled(Box)<{ active?: string }>(({ active }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: "8px 10px 8px 12px",
  cursor: "pointer",
  borderLeft: active === "true" ? "2px solid #51a2ff" : "2px solid transparent",
  background: active === "true" ? "rgba(81, 162, 255, 0.08)" : "transparent",
  transition: "background 0.15s ease",
  "&:hover": {
    background: active === "true"
      ? "rgba(81, 162, 255, 0.12)"
      : "rgba(255, 255, 255, 0.04)",
  },
  "&:hover .project-delete": { opacity: 1 },
}));

const ProjectName = styled(Typography)(() => ({
  fontSize: 13,
  fontWeight: 500,
  color: "#e3f2fd",
  wordBreak: "break-word",
  lineHeight: 1.3,
  flex: 1,
  minWidth: 0,
}));

const ProjectDate = styled(Typography)(() => ({
  fontSize: 10,
  color: "rgba(255,255,255,0.35)",
  marginTop: 2,
}));

const NameInput = styled("input")(() => ({
  background: "rgba(81, 162, 255, 0.1)",
  border: "1px solid rgba(81, 162, 255, 0.4)",
  borderRadius: 4,
  color: "#e3f2fd",
  fontSize: 13,
  fontWeight: 500,
  padding: "2px 6px",
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
}));

const DeleteBtn = styled(IconButton)(() => ({
  opacity: 0,
  transition: "opacity 0.15s ease",
  color: "rgba(255,255,255,0.4)",
  padding: 3,
  flexShrink: 0,
  "&:hover": { color: "#ef5350", background: "rgba(239,83,80,0.1)" },
}));

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface ProjectSidebarProps {
  projects: ProjectSnapshot[];
  activeProjectId: string | null;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  activeProjectId,
  onSwitch,
  onNew,
  onRename,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  const startEdit = (e: React.MouseEvent, project: ProjectSnapshot) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditValue(project.name);
  };

  const commitEdit = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== projects.find((p) => p.id === id)?.name) {
      onRename(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <SidebarRoot>
      <SidebarHeader>
        <HeaderTitle>Projects</HeaderTitle>
        <Tooltip title="New project" arrow placement="right">
          <IconButton
            size="small"
            onClick={onNew}
            sx={{
              color: "rgba(81,162,255,0.7)",
              padding: "3px",
              "&:hover": { color: "#51a2ff", background: "rgba(81,162,255,0.1)" },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </SidebarHeader>

      <ProjectList>
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const isEditing = editingId === project.id;

          return (
            <ProjectItem
              key={project.id}
              active={isActive ? "true" : undefined}
              onClick={() => !isEditing && onSwitch(project.id)}
            >
              <Box sx={{ mr: 1, flexShrink: 0, mt: "1px" }}>
                {isActive ? (
                  <FolderOpenIcon sx={{ fontSize: 15, color: "#51a2ff" }} />
                ) : (
                  <FolderIcon sx={{ fontSize: 15, color: "rgba(255,255,255,0.3)" }} />
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <NameInput
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(project.id)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(project.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <ProjectName
                    onDoubleClick={(e) => startEdit(e, project)}
                    title="Double-click to rename"
                  >
                    {project.name}
                  </ProjectName>
                )}
                <ProjectDate>{relativeTime(project.lastModified)}</ProjectDate>
              </Box>

              {!isEditing && projects.length > 1 && (
                <DeleteBtn
                  className="project-delete"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                  title="Delete project"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </DeleteBtn>
              )}
            </ProjectItem>
          );
        })}
      </ProjectList>
    </SidebarRoot>
  );
};

export default ProjectSidebar;
export { SIDEBAR_WIDTH };
