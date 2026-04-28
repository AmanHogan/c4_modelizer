import {
  CodeBlock,
  ComponentBlock,
  ContainerBlock,
  SystemBlock,
  useFlatActiveElements,
  useFlatEdges,
  useFlatModelActions,
  useFlatNavigation,
  useFlatNodes,
  useFlatStore,
} from "@archivisio/c4-modelizer-sdk";
import { useGroupStore } from "@stores/groupStore";
import { useNodeSizeStore } from "@stores/nodeSizeStore";
import { Node } from "@xyflow/react";
import CodeEditDialog from "@components/code/CodeEditDialog";
import ConfirmDialog from "@components/common/ConfirmDialog";
import ComponentEditDialog from "@components/component/ComponentEditDialog";
import ConnectionEditDialog from "@components/ConnectionEditDialog";
import ContainerEditDialog from "@components/container/ContainerEditDialog";
import ErrorNotification from "@components/ErrorNotification";
import FlowCanvas from "@components/FlowCanvas";
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
import React, { useRef } from "react";
import "./i18n";

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

  // --- Node size store (user-resized blocks) ---
  const { getSize: getNodeSize } = useNodeSizeStore();

  // Always give every C4 node an explicit width (and height if saved) so
  // NodeResizer has known dimensions to anchor its handles to.
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

  // --- Group state ---
  const { addGroup, updateGroup, removeGroup, getGroupsForView, getNextColor } = useGroupStore();

  // A key that identifies the current view (level + active IDs) so groups are scoped per diagram view
  const viewKey = `${model.viewLevel}:${model.activeSystemId ?? ""}:${model.activeContainerId ?? ""}:${model.activeComponentId ?? ""}`;

  const groups = getGroupsForView(viewKey);

  // Convert stored groups into React Flow nodes (rendered behind SDK nodes via zIndex: -1)
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
    addGroup({
      id,
      label: "Group",
      position: { x: 80, y: 80 },
      width: 420,
      height: 300,
      color,
      viewKey,
    });
  };

  const handleGroupDelete = (id: string) => {
    removeGroup(id);
  };

  const handleCloneDoubleClick = (
    block: SystemBlock | ContainerBlock | ComponentBlock | CodeBlock
  ) => {
    const originalId = block.original?.id;
    if (!originalId) return;

    const originalBlock = getBlockById(originalId);
    if (originalBlock?.type === "system") {
      navigateToView("container", originalBlock.id);
    } else if (originalBlock?.type === "container") {
      const containerBlock = originalBlock as ContainerBlock;
      navigateToView("component", containerBlock.systemId, containerBlock.id);
    } else if (originalBlock?.type === "component") {
      const componentBlock = originalBlock as ComponentBlock;
      navigateToView(
        "code",
        componentBlock.systemId,
        componentBlock.containerId,
        componentBlock.id
      );
    }
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    const block = getBlockById(nodeId);
    if (block?.original) {
      return handleCloneDoubleClick(block);
    }
    if (model.viewLevel === "system") {
      navigateToContainer(nodeId);
    } else if (model.viewLevel === "container" && model.activeSystemId) {
      navigateToComponent(model.activeSystemId, nodeId);
    } else if (
      model.viewLevel === "component" &&
      model.activeSystemId &&
      model.activeContainerId
    ) {
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
    setTimeout(() => {
      resetButtonRef.current?.focus();
    }, 100);
  };

  return (
    <ReactFlowProvider>
      <Box sx={{ height: "100vh", bgcolor: "#0a1929", color: "#fff" }}>
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
          onConfirm={() => {
            resetStore();
            handleCloseReset();
          }}
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
              handleElementSave(editingElement.id, {
                name,
                description,
                technology,
                url,
              });
              closeEditDialog();
            }}
            onDelete={() => {
              handleNodeDelete(editingElement.id);
              closeEditDialog();
            }}
            onClose={closeEditDialog}
          />
        )}

        {isEditingContainer && editingElement && (
          <ContainerEditDialog
            open={dialogOpen}
            initialName={editingElement.name}
            initialDescription={editingElement.description || ""}
            initialTechnology={
              (editingElement as ContainerBlock).technology || ""
            }
            initialUrl={editingElement.url || ""}
            onSave={(name, description, technology, url) => {
              handleElementSave(editingElement.id, {
                name,
                description,
                technology,
                url,
              });
              closeEditDialog();
            }}
            onDelete={() => {
              handleNodeDelete(editingElement.id);
              closeEditDialog();
            }}
            onClose={closeEditDialog}
          />
        )}

        {model.viewLevel === "component" && editingElement && (
          <ComponentEditDialog
            open={dialogOpen}
            initialName={editingElement.name}
            initialDescription={editingElement.description || ""}
            initialTechnology={
              (editingElement as ComponentBlock).technology || ""
            }
            initialUrl={editingElement.url || ""}
            onSave={(name, description, technology, url) => {
              handleElementSave(editingElement.id, {
                name,
                description,
                technology,
                url,
              });
              closeEditDialog();
            }}
            onDelete={() => {
              handleNodeDelete(editingElement.id);
              closeEditDialog();
            }}
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
              handleElementSave(editingElement.id, {
                name,
                description,
                codeType,
                technology,
                code,
                url,
              });
              closeEditDialog();
            }}
            onDelete={() => {
              handleNodeDelete(editingElement.id);
              closeEditDialog();
            }}
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
            onSave={(connectionInfo) => {
              handleConnectionSave(connectionInfo);
              closeConnectionDialog();
            }}
            onDelete={(connectionInfo) => {
              handleConnectionDelete(connectionInfo);
              closeConnectionDialog();
            }}
          />
        )}
        <FooterSlot />
      </Box>
    </ReactFlowProvider>
  );
}

export default App;
