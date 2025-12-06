"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Create a new folder to organize notes. Use this when the user wants to create a category or organize their notes.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the folder to create"
          },
          parentId: {
            type: "string",
            description: "Optional. The ID of the parent folder if creating a nested folder."
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "move_note_to_folder",
      description: "Move an existing note into a folder. Use this to organize notes into categories.",
      parameters: {
        type: "object",
        properties: {
          noteId: {
            type: "string",
            description: "The ID of the note to move"
          },
          folderId: {
            type: "string",
            description: "The ID of the destination folder. Use null to move to root."
          }
        },
        required: ["noteId", "folderId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note with the specified title and content.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the new note"
          },
          content: {
            type: "string",
            description: "The content of the new note in plain text or HTML"
          },
          folderId: {
            type: "string",
            description: "Optional. The ID of the folder to put the note in."
          }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "List all notes, optionally filtered by folder. Use this to see what notes exist before organizing them.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "Optional. Filter notes by folder ID. If not provided, lists all notes."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_folders",
      description: "List all folders. Use this to see the folder structure before creating or moving items.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rename_note",
      description: "Rename an existing note.",
      parameters: {
        type: "object",
        properties: {
          noteId: {
            type: "string",
            description: "The ID of the note to rename"
          },
          newTitle: {
            type: "string",
            description: "The new title for the note"
          }
        },
        required: ["noteId", "newTitle"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rename_folder",
      description: "Rename an existing folder.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "The ID of the folder to rename"
          },
          newName: {
            type: "string",
            description: "The new name for the folder"
          }
        },
        required: ["folderId", "newName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_folder",
      description: "Delete a folder. Notes inside will be moved to root level.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "The ID of the folder to delete"
          }
        },
        required: ["folderId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "Delete a note.",
      parameters: {
        type: "object",
        properties: {
          noteId: {
            type: "string",
            description: "The ID of the note to delete"
          }
        },
        required: ["noteId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Search notes by keyword or phrase. Use this to find specific notes.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query"
          }
        },
        required: ["query"]
      }
    }
  }
];
exports.AI_TOOLS = AI_TOOLS;
