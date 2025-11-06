import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea, TextInput } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";
import { setJsonValueAtPath } from "../../editor/views/GraphView/lib/jsonUtils";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const [editMode, setEditMode] = React.useState(false);
  const [editedText, setEditedText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [nameValue, setNameValue] = React.useState<string>("");
  const [colorValue, setColorValue] = React.useState<string>("");

  React.useEffect(() => {
    if (!nodeData) return;
    const nameRow = nodeData.text.find(r => r.key === "name");
    const colorRow = nodeData.text.find(r => r.key === "color");
    setNameValue(nameRow ? String(nameRow.value ?? "") : "");
    setColorValue(colorRow ? String(colorRow.value ?? "") : "");
  }, [nodeData]);

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs" align="center">
              {!editMode && (
                <Button size="xs" variant="outline" onClick={() => {
                  // Initialize editor with node content
                  // debug
                  // eslint-disable-next-line no-console
                  console.log('[NodeModal] Edit clicked', { path: nodeData?.path });
                  setEditedText(normalizeNodeData(nodeData?.text ?? []));
                  setError(null);
                  setEditMode(true);
                }}>
                  Edit
                </Button>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>
          {!editMode ? (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          ) : (
            <Stack gap="xs">
              <TextInput
                label="Name"
                placeholder="Enter name"
                value={nameValue}
                onChange={e => setNameValue(e.currentTarget.value)}
              />
              <TextInput
                label="Color"
                placeholder="#RRGGBB or color name"
                value={colorValue}
                onChange={e => setColorValue(e.currentTarget.value)}
              />
            </Stack>
          )}
        </Stack>
        {error && (
          <Text color="red" fz="xs">
            {error}
          </Text>
        )}
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
        {editMode && (
          <Flex gap="xs" justify="flex-end">
            <Button size="xs" variant="default" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button size="xs" onClick={() => {
              // Save handler for per-field editing (name, color)
              setError(null);
              try {
                // debug
                // eslint-disable-next-line no-console
                console.log('[NodeModal] Save clicked', { path: nodeData?.path, nameValue, colorValue });

                const jsonStr = useJson.getState().getJson();
                const root = JSON.parse(jsonStr);
                // debug
                // eslint-disable-next-line no-console
                console.log('[NodeModal] root before update', root);

                const path = nodeData?.path ?? [];

                let updated: any = root;
                // set name
                if (nameValue !== undefined) {
                  updated = setJsonValueAtPath(updated, [...path, "name"], nameValue);
                }
                // set color
                if (colorValue !== undefined) {
                  updated = setJsonValueAtPath(updated, [...path, "color"], colorValue);
                }

                // debug
                // eslint-disable-next-line no-console
                console.log('[NodeModal] updated root', updated);

                // update global json state (graph) and editor contents
                useJson.getState().setJson(JSON.stringify(updated, null, 2));
                // also update the file editor contents so the left editor reflects the change
                // use setState directly to avoid triggering the debounced update back to useJson
                //Basically fixes the bug where we weren't able to see the json change. 
                useFile.setState({ contents: JSON.stringify(updated, null, 2), hasChanges: true });

                setEditMode(false);
                onClose?.();
              } catch (err: any) {
                setError(err?.message ?? "Invalid input");
              }
            }}>
              Save
            </Button>
          </Flex>
        )}
      </Stack>
    </Modal>
  );
};
