import {
  CodeBlock,
  ComponentBlock,
  ContainerBlock,
  FlatC4Model,
  SystemBlock,
  useFlatActiveElements,
  useFlatC4Store,
  useFlatEdges,
  useFlatModelActions,
  useFlatNavigation,
  useFlatNodes,
  useFlatStore,
} from "@archivisio/c4-modelizer-sdk";
import { useGroupStore } from "@stores/groupStore";
import { useNodeSizeStore } from "@stores/nodeSizeStore";
import { useProjectStore } from "@stores/projectStore";
import { Node } from "@xyflow/react";
import CodeEditDialog from "@components/code/CodeEditDialog";
import ConfirmDialog from "@components/common/ConfirmDialog";
import ComponentEditDialog from "@components/component/ComponentEditDialog";
import ConnectionEditDialog from "@components/ConnectionEditDialog";
import ContainerEditDialog from "@components/container/ContainerEditDialog";
import ErrorNotification from "@components/ErrorNotification";
import FlowCanvas from "@components/FlowCanvas";
import ProjectSidebar, { SIDEBAR_WIDTH } from "@components/ProjectSidebar";
import SearchNodeBar from "@components/SearchNodeBar";
import SystemEditDialog from "@components/system/SystemEditDialog";
import { useDialogs } from "@contexts/DialogContext";
import { useFileOperations } from "@hooks/useFileOperations";
import { Box } from "@mui/material";
import FooterSlot from "@slots/FooterSlot";
import NavBarSlot from "@slots/NavBarSlot";
import ToolbarSlot from "@slots/ToolbarSlot";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useEffect, useRef } from "react";
import "./i18n";

const EMPTY_MODEL: FlatC4Model = {
  systems: [],
  containers: [],
  components: [],
  codeElements: [],
  viewLevel: "system",
};

function App() {
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const {
    navigateToContainer,
    navigateToComponent,
    navigateToCode,
    navigateToView,
  } = useFlatNavigation();
  const {
    dialogOpen,
    isEditingContainer,
    connectionDialogOpen,
    editingConnection,
    openConfirmReset,
    notificationError,
    editingElement,
    setNotificationError,
    closeEditDialog,
    closeConnectionDialog,
    handleOpenResetDialog,
    handleCloseResetDialog,
    openEditDialog,
    openConnectionDialog,
  } = useDialogs();

  const { activeSystem, activeContainer, activeComponent } =
    useFlatActiveElements();

  const { currentNodes, handleNodePositionChange: sdkHandleNodePositionChange } = useFlatNodes({
    onEditSystem: (id: string) => openEditDialog(id, false),
    onEditContainer: (id: string) => openEditDialog(id, true),
    onEditComponent: (id: string) => openEditDialog(id, false),
    onEditCode: (id: string) => openEditDialog(id, false),
  });

  const { getBlockById } = useFlatStore();

  const {
    edges,
    onConnect,
    handleEdgeClick,
    handleConnectionSave,
    handleConnectionDelete,
  } = useFlatEdges({
    onConnectionDialog: openConnectionDialog,
  });

  const {
    model,
    resetStore,
    handleAddElement,
    handleElementSave,
    handleNodeDelete,
  } = useFlatModelActions();

  const { handleExport, handleFileInputChange } = useFileOperations();

  // --- Node size store ---
  const { getSize: getNodeSize, sizes: allNodeSizes, setAllSizes } = useNodeSizeStore();

  const sizedCurrentNodes: Node[] = currentNodes.map((node) => {
    const saved = getNodeSize(node.id);
    return {
      ...node,
      style: {
        ...node.style,
        width: saved?.width ?? 250,
        ...(saved?.height !== undefined ? { height: saved.height } : {}),
      },
    };
  });

  // --- Group store ---
  const {
    addGroup,
    updateGroup,
    removeGroup,
    getGroupsForView,
    getNextColor,
    groups: allGroups,
    setAllGroups,
  } = useGroupStore();

  const viewKey = `${model.viewLevel}:${model.activeSystemId ?? ""}:${model.activeContainerId ?? ""}:${model.activeComponentId ?? ""}`;
  const groups = getGroupsForView(viewKey);

  const groupNodes: Node[] = groups.map((g) => ({
    id: g.id,
    type: "group",
    position: g.position,
    style: { width: g.width, height: g.height },
    zIndex: -1,
    selectable: true,
    draggable: true,
    data: {
      label: g.label,
      color: g.color,
      onDelete: (id: string) => removeGroup(id),
    },
  }));

  const allNodes: Node[] = [...groupNodes, ...sizedCurrentNodes];

  // --- Project store ---
  const {
    projects,
    activeProjectId,
    createProject,
    deleteProject,
    renameProject,
    saveProject,
    setActiveProjectId,
    getProject,
  } = useProjectStore();

  // On first mount: migrate existing data into a project, or restore active project.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (projects.length === 0) {
      // Migration: wrap the current SDK model into "Project 1"
      const currentModel = useFlatC4Store.getState().model;
      const id = createProject("Project 1", currentModel, allGroups, allNodeSizes);
      setActiveProjectId(id);
    }
    // If projects already exist, the SDK's own localStorage persist has already
    // rehydrated the last-used model automatically — nothing to do.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save: keep the active project snapshot up to date.
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeProjectId || projects.length === 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveProject(activeProjectId, model, allGroups, allNodeSizes);
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [model, allGroups, allNodeSizes, activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwitchProject = useCallback(
    (targetId: string) => {
      if (targetId === activeProjectId) return;

      // Flush current state into the snapshot immediately before switching
      if (activeProjectId) {
        saveProject(activeProjectId, model, allGroups, allNodeSizes);
      }

      const target = getProject(targetId);
      if (!target) return;

      // Load the target project
      useFlatC4Store.getState().setModel(target.model);
      setAllGroups(target.groups);
      setAllSizes(target.nodeSizes);
      setActiveProjectId(targetId);
    },
    [activeProjectId, model, allGroups, allNodeSizes, saveProject, getProject, setAllGroups, setAllSizes, setActiveProjectId]
  );

  const handleNewProject = useCallback(() => {
    // Save current before creating
    if (activeProjectId) {
      saveProject(activeProjectId, model, allGroups, allNodeSizes);
    }

    // Reset everything to a blank slate
    useFlatC4Store.getState().setModel(EMPTY_MODEL);
    setAllGroups([]);
    setAllSizes({});

    const newCount = projects.length + 1;
    const id = createProject(`Project ${newCount}`, EMPTY_MODEL, [], {});
    setActiveProjectId(id);
  }, [activeProjectId, model, allGroups, allNodeSizes, projects.length, saveProject, createProject, setActiveProjectId, setAllGroups, setAllSizes]);

  const handleDeleteProject = useCallback(
    (id: string) => {
      const wasCurrent = id === activeProjectId;
      deleteProject(id); // store handles picking the new activeProjectId

      if (wasCurrent) {
        // Load whichever project the store picked as the new active one
        const updated = useProjectStore.getState();
        const next = updated.projects.find((p) => p.id === updated.activeProjectId);
        if (next) {
          useFlatC4Store.getState().setModel(next.model);
          setAllGroups(next.groups);
          setAllSizes(next.nodeSizes);
        }
      }
    },
    [activeProjectId, deleteProject, setAllGroups, setAllSizes]
  );

  // --- Node position / group handling ---
  const handleNodePositionChange = (id: string, position: { x: number; y: number }) => {
    if (id.startsWith("group-")) {
      updateGroup(id, { position });
    } else {
      sdkHandleNodePositionChange(id, position);
    }
  };

  const handleAddGroup = () => {
    const id = `group-${Date.now()}`;
    const color = getNextColor(viewKey);
    addGroup({ id, label: "Group", position: { x: 80, y: 80 }, width: 420, height: 300, color, viewKey });
  };

  const handleGroupDelete = (id: string) => removeGroup(id);

  // --- Navigation ---
  const handleCloneDoubleClick = (
    block: SystemBlock | ContainerBlock | ComponentBlock | CodeBlock
  ) => {
    const originalId = block.original?.id;
    if (!originalId) return;
    const originalBlock = getBlockById(originalId);
    if (originalBlock?.type === "system") {
      navigateToView("container", originalBlock.id);
    } else if (originalBlock?.type === "container") {
      const cb = originalBlock as ContainerBlock;
      navigateToView("component", cb.systemId, cb.id);
    } else if (originalBlock?.type === "component") {
      const cb = originalBlock as ComponentBlock;
      navigateToView("code", cb.systemId, cb.containerId, cb.id);
    }
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    const block = getBlockById(nodeId);
    if (block?.original) return handleCloneDoubleClick(block);
    if (model.viewLevel === "system") {
      navigateToContainer(nodeId);
    } else if (model.viewLevel === "container" && model.activeSystemId) {
      navigateToComponent(model.activeSystemId, nodeId);
    } else if (model.viewLevel === "component" && model.activeSystemId && model.activeContainerId) {
      navigateToCode(model.activeSystemId, model.activeContainerId, nodeId);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileInputChange(e, setNotificationError);
  };

  const handleCloseReset = () => {
    handleCloseResetDialog();
    setTimeout(() => { resetButtonRef.current?.focus(); }, 100);
  };

  return (
    <ReactFlowProvider>
      <Box sx={{
          display: "grid",
          gridTemplateColumns: `${SIDEBAR_WIDTH}px 1fr`,
          height: "100vh",
          width: "100vw",
          bgcolor: "#0a1929",
          color: "#fff",
        }}>

        {/* Left project sidebar */}
        <ProjectSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSwitch={handleSwitchProject}
          onNew={handleNewProject}
          onRename={renameProject}
          onDelete={handleDeleteProject}
        />

        {/* Main content area — 1fr fills exactly the remaining viewport width */}
        <Box sx={{ overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ToolbarSlot
            onAddSystem={handleAddElement}
            onAddGroup={handleAddGroup}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleOpenResetDialog}
            model={model}
            ref={resetButtonRef}
          />

          <ConfirmDialog
            open={openConfirmReset}
            title="Reset model ?"
            content="This action will delete your entire diagram and reset the application. Are you sure you want to continue?"
            onCancel={handleCloseReset}
            onConfirm={() => { resetStore(); handleCloseReset(); }}
            confirmText="Yes, reset"
            cancelText="Cancel"
          />

          <NavBarSlot
            systemName={activeSystem?.name}
            containerName={activeContainer?.name}
            componentName={activeComponent?.name}
          />

          <FlowCanvas
            nodes={allNodes}
            edges={edges}
            onConnect={onConnect}
            onNodePositionChange={handleNodePositionChange}
            viewLevel={model.viewLevel}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeClick={handleEdgeClick}
            onGroupDelete={handleGroupDelete}
          />

          {model.viewLevel === "system" && editingElement && (
            <SystemEditDialog
              open={dialogOpen}
              initialName={editingElement.name}
              initialDescription={editingElement.description || ""}
              initialTechnology={(editingElement as SystemBlock).technology || ""}
              initialUrl={editingElement.url || ""}
              onSave={(name, description, technology, url) => {
                handleElementSave(editingElement.id, { name, description, technology, url });
                closeEditDialog();
              }}
              onDelete={() => { handleNodeDelete(editingElement.id); closeEditDialog(); }}
              onClose={closeEditDialog}
            />
          )}

          {isEditingContainer && editingElement && (
            <ContainerEditDialog
              open={dialogOpen}
              initialName={editingElement.name}
              initialDescription={editingElement.description || ""}
              initialTechnology={(editingElement as ContainerBlock).technology || ""}
              initialUrl={editingElement.url || ""}
              onSave={(name, description, technology, url) => {
                handleElementSave(editingElement.id, { name, description, technology, url });
                closeEditDialog();
              }}
              onDelete={() => { handleNodeDelete(editingElement.id); closeEditDialog(); }}
              onClose={closeEditDialog}
            />
          )}

          {model.viewLevel === "component" && editingElement && (
            <ComponentEditDialog
              open={dialogOpen}
              initialName={editingElement.name}
              initialDescription={editingElement.description || ""}
              initialTechnology={(editingElement as ComponentBlock).technology || ""}
              initialUrl={editingElement.url || ""}
              onSave={(name, description, technology, url) => {
                handleElementSave(editingElement.id, { name, description, technology, url });
                closeEditDialog();
              }}
              onDelete={() => { handleNodeDelete(editingElement.id); closeEditDialog(); }}
              onClose={closeEditDialog}
            />
          )}

          {model.viewLevel === "code" && editingElement && (
            <CodeEditDialog
              open={dialogOpen}
              initialName={editingElement.name}
              initialDescription={editingElement.description || ""}
              initialCodeType={((editingElement as CodeBlock).codeType as "function" | "class" | "interface" | "variable" | "other") || "class"}
              initialLanguage={(editingElement as CodeBlock).technology || ""}
              initialCode={(editingElement as CodeBlock).code || ""}
              initialUrl={editingElement.url || ""}
              onSave={(name, description, codeType, technology, code, url) => {
                handleElementSave(editingElement.id, { name, description, codeType, technology, code, url });
                closeEditDialog();
              }}
              onDelete={() => { handleNodeDelete(editingElement.id); closeEditDialog(); }}
              onClose={closeEditDialog}
            />
          )}

          <SearchNodeBar />
          <ErrorNotification message={notificationError} />

          {connectionDialogOpen && (
            <ConnectionEditDialog
              open={connectionDialogOpen}
              connection={editingConnection}
              onClose={closeConnectionDialog}
              onSave={(connectionInfo) => { handleConnectionSave(connectionInfo); closeConnectionDialog(); }}
              onDelete={(connectionInfo) => { handleConnectionDelete(connectionInfo); closeConnectionDialog(); }}
            />
          )}
          <FooterSlot />
        </Box>
      </Box>
    </ReactFlowProvider>
  );
}

export default App;
