import { useEffect, useMemo, useRef, useState } from "react";

function Resources({ email }) {
  const [connections, setConnections] = useState([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [resources, setResources] = useState([]);
  const [ownedResourceIds, setOwnedResourceIds] = useState(new Set());

  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef(null);

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".txt",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
  ];

  useEffect(() => {
    loadConnections();
    loadResources();
  }, []);

  async function loadConnections() {
    try {
      setLoadingConnections(true);

      const response = await fetch(
        "/api/documents/connections",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          `Connections request failed: ${response.status} ${text}`
        );
      }

      const data = await response.json();

      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message || "Unable to load connections."
      );
    } finally {
      setLoadingConnections(false);
    }
  }

  async function loadResources() {
    try {
      setLoadingResources(true);

      const [sharedResponse, uploadedResponse] =
        await Promise.all([
          fetch("/api/documents/my-resources", {
            credentials: "include",
          }),

          fetch("/api/documents/uploaded-by-me", {
            credentials: "include",
          }),
        ]);

      if (!sharedResponse.ok) {
        const text = await sharedResponse.text();

        throw new Error(
          `Shared resources request failed: ${sharedResponse.status} ${text}`
        );
      }

      if (!uploadedResponse.ok) {
        const text = await uploadedResponse.text();

        throw new Error(
          `Uploaded resources request failed: ${uploadedResponse.status} ${text}`
        );
      }

      const sharedData = await sharedResponse.json();
      const uploadedData = await uploadedResponse.json();

      const sharedResources = Array.isArray(sharedData)
        ? sharedData
        : [];

      const uploadedResources = Array.isArray(
        uploadedData
      )
        ? uploadedData
        : [];

      const ownedIds = new Set(
        uploadedResources.map(
          (resource) => resource.id
        )
      );

      setOwnedResourceIds(ownedIds);

      const combined = [
        ...sharedResources,
        ...uploadedResources,
      ];

      const uniqueResources = Array.from(
        new Map(
          combined.map((resource) => [
            resource.id,
            resource,
          ])
        ).values()
      );

      uniqueResources.sort(
        (a, b) =>
          new Date(b.uploadedAt || 0) -
          new Date(a.uploadedAt || 0)
      );

      setResources(uniqueResources);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load resources."
      );
    } finally {
      setLoadingResources(false);
    }
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function validateFile(file) {
    if (!file) {
      return "Please choose a file.";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "File size must be 10 MB or less.";
    }

    const fileName = file.name.toLowerCase();

    const validExtension =
      allowedExtensions.some((extension) =>
        fileName.endsWith(extension)
      );

    if (!validExtension) {
      return "This file type is not supported.";
    }

    return "";
  }

  function handleFileChange(event) {
    const file =
      event.target.files?.[0] || null;

    clearMessages();

    const validationError =
      validateFile(file);

    if (validationError) {
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setError(validationError);
      return;
    }

    setSelectedFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();

    clearMessages();

    const file =
      event.dataTransfer.files?.[0] || null;

    const validationError =
      validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      return;
    }

    setSelectedFile(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  async function handleUpload(event) {
    event.preventDefault();

    clearMessages();

    if (!selectedConnectionId) {
      setError("Please choose a connected user.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose a file.");
      return;
    }

    const selectedConnection =
      connections.find(
        (connection) =>
          String(connection.id) ===
          String(selectedConnectionId)
      );

    if (!selectedConnection) {
      setError(
        "Please select a valid connected user."
      );
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append(
        "file",
        selectedFile
      );

      formData.append(
        "connectionUserId",
        String(selectedConnection.id)
      );

      const response = await fetch(
        "/api/documents/upload",
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const responseText =
        await response.text();

      let result = {};

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        result = {
          message: responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Upload failed with status ${response.status}.`
        );
      }

      setSuccess(
        `"${selectedFile.name}" shared with ${selectedConnection.name}.`
      );

      setSelectedFile(null);
      setSelectedConnectionId("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadResources();
    } catch (err) {
      setError(
        err.message ||
          "Unable to upload the resource."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(resourceId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?"
    );

    if (!confirmed) {
      return;
    }

    try {
      clearMessages();

      const response = await fetch(
        `/api/documents/${resourceId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const responseText =
        await response.text();

      let result = {};

      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        result = {
          message: responseText,
        };
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Delete failed with status ${response.status}.`
        );
      }

      setSuccess(
        "Resource deleted successfully."
      );

      await loadResources();
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete the resource."
      );
    }
  }

  function handleDownload(resourceId) {
    window.open(
      `/api/documents/download/${resourceId}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function formatFileSize(bytes) {
    if (!bytes) {
      return "0 B";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!value) {
      return "Unknown date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getFileIcon(fileName = "") {
    const name = fileName.toLowerCase();

    if (name.endsWith(".pdf")) {
      return "📕";
    }

    if (
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    ) {
      return "📘";
    }

    if (
      name.endsWith(".ppt") ||
      name.endsWith(".pptx")
    ) {
      return "📙";
    }

    if (
      name.endsWith(".xls") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".csv")
    ) {
      return "📗";
    }

    if (
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg")
    ) {
      return "🖼️";
    }

    if (name.endsWith(".txt")) {
      return "📝";
    }

    return "📄";
  }

  function getUploaderName(resource) {
    if (ownedResourceIds.has(resource.id)) {
      return "You";
    }

    const uploader =
      connections.find(
        (connection) =>
          String(connection.id) ===
          String(resource.uploadedBy)
      );

    return uploader?.name || "SkillSwap member";
  }

  const filteredResources = useMemo(() => {
    const query =
      searchTerm.trim().toLowerCase();

    if (!query) {
      return resources;
    }

    return resources.filter(
      (resource) =>
        resource.fileName
          ?.toLowerCase()
          .includes(query)
    );
  }, [resources, searchTerm]);

  const totalSize = useMemo(() => {
    return resources.reduce(
      (total, resource) =>
        total + (resource.fileSize || 0),
      0
    );
  }, [resources]);

  const selectedConnection =
    connections.find(
      (connection) =>
        String(connection.id) ===
        String(selectedConnectionId)
    );

  return (
    <div className="resources-page">

      <style>{`
        .resources-page {
          min-height: 100%;
          padding: 28px 24px 50px;
          position: relative;
        }

        .resources-page::before {
          content: "";
          position: fixed;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: rgba(90, 70, 255, 0.10);
          filter: blur(90px);
          top: 100px;
          right: -140px;
          pointer-events: none;
        }

        .resources-page::after {
          content: "";
          position: fixed;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          background: rgba(0, 210, 255, 0.07);
          filter: blur(100px);
          bottom: 80px;
          left: -120px;
          pointer-events: none;
        }

        .resources-shell {
          max-width: 1180px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .resources-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 28px;
        }

        .resources-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          font-size: 12px;
          color: rgba(255,255,255,0.72);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 13px;
        }

        .resources-hero h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 52px);
          line-height: 1;
          letter-spacing: -0.04em;
          background: linear-gradient(90deg, #ffffff, #a5c7ff 55%, #c7b5ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .resources-hero p {
          margin: 13px 0 0;
          max-width: 610px;
          color: rgba(255,255,255,0.62);
          font-size: 15px;
          line-height: 1.7;
        }

        .resources-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          gap: 10px;
          min-width: 340px;
        }

        .resources-stat {
          padding: 15px 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }

        .resources-stat-value {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
        }

        .resources-stat-label {
          margin-top: 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.45);
        }

        .resources-alert {
          padding: 14px 16px;
          border-radius: 15px;
          margin-bottom: 18px;
          backdrop-filter: blur(15px);
        }

        .resources-alert.error {
          background: rgba(255, 76, 102, 0.10);
          border: 1px solid rgba(255, 76, 102, 0.22);
          color: #ffb9c5;
        }

        .resources-alert.success {
          background: rgba(64, 220, 153, 0.10);
          border: 1px solid rgba(64, 220, 153, 0.22);
          color: #adffdb;
        }

        .resources-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.4fr);
          gap: 20px;
          align-items: start;
        }

        .resources-card {
          border-radius: 24px;
          padding: 22px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.065),
              rgba(255,255,255,0.025)
            );
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow:
            0 18px 60px rgba(0,0,0,0.16),
            inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(18px);
        }

        .resources-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }

        .resources-card h2 {
          margin: 0;
          font-size: 19px;
          color: #ffffff;
        }

        .resources-card-subtitle {
          margin: 7px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255,255,255,0.53);
        }

        .resources-upload-dropzone {
          border: 1px dashed rgba(130, 150, 255, 0.34);
          border-radius: 20px;
          padding: 25px 18px;
          text-align: center;
          background:
            linear-gradient(
              145deg,
              rgba(80,90,255,0.08),
              rgba(0,210,255,0.035)
            );
          transition: 0.22s ease;
          cursor: pointer;
        }

        .resources-upload-dropzone:hover {
          border-color: rgba(160, 170, 255, 0.62);
          transform: translateY(-1px);
          background:
            linear-gradient(
              145deg,
              rgba(80,90,255,0.12),
              rgba(0,210,255,0.05)
            );
        }

        .resources-upload-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 18px;
          font-size: 27px;
          background: rgba(255,255,255,0.075);
          border: 1px solid rgba(255,255,255,0.09);
        }

        .resources-upload-title {
          color: #ffffff;
          font-weight: 750;
          font-size: 15px;
        }

        .resources-upload-description {
          margin-top: 6px;
          color: rgba(255,255,255,0.48);
          font-size: 12px;
          line-height: 1.5;
        }

        .resources-upload-file {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 13px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.07);
          text-align: left;
        }

        .resources-label {
          display: block;
          margin: 17px 0 7px;
          color: rgba(255,255,255,0.74);
          font-size: 12px;
          font-weight: 700;
        }

        .resources-select,
        .resources-search {
          width: 100%;
          box-sizing: border-box;
          border-radius: 13px;
          padding: 12px 13px;
          color: #ffffff;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.10);
          outline: none;
          transition: 0.2s ease;
        }

        .resources-select:focus,
        .resources-search:focus {
          border-color: rgba(120,140,255,0.55);
          box-shadow: 0 0 0 3px rgba(110,130,255,0.08);
        }

        .resources-select option {
          color: #111111;
        }

        .resources-button {
          width: 100%;
          border: none;
          border-radius: 13px;
          padding: 12px 15px;
          margin-top: 15px;
          font-weight: 800;
          cursor: pointer;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #5965ff,
            #7d4dff
          );
          box-shadow: 0 10px 24px rgba(92,81,255,0.20);
          transition: 0.2s ease;
        }

        .resources-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 13px 28px rgba(92,81,255,0.27);
        }

        .resources-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .resources-selected-user {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 13px;
          background: rgba(80, 215, 164, 0.08);
          border: 1px solid rgba(80, 215, 164, 0.16);
        }

        .resources-avatar {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-weight: 800;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #5365ff,
            #9c52ff
          );
        }

        .resources-selected-user-name {
          font-size: 13px;
          font-weight: 750;
          color: #ffffff;
        }

        .resources-selected-user-email {
          margin-top: 2px;
          font-size: 11px;
          color: rgba(255,255,255,0.45);
        }

        .resources-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 17px;
        }

        .resources-search-wrap {
          position: relative;
          min-width: 230px;
          flex: 1;
        }

        .resources-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.45;
          pointer-events: none;
        }

        .resources-search {
          padding-left: 35px;
        }

        .resources-count {
          flex-shrink: 0;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.67);
          font-size: 11px;
        }

        .resources-list {
          display: grid;
          gap: 11px;
        }

        .resource-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          border-radius: 17px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          transition: 0.2s ease;
        }

        .resource-item:hover {
          background: rgba(255,255,255,0.055);
          border-color: rgba(140,150,255,0.20);
          transform: translateY(-1px);
        }

        .resource-file-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(255,255,255,0.065);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 22px;
        }

        .resource-content {
          min-width: 0;
          flex: 1;
        }

        .resource-name {
          font-weight: 760;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .resource-meta {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 6px;
          color: rgba(255,255,255,0.44);
          font-size: 11px;
        }

        .resource-owner {
          color: rgba(255,255,255,0.67);
        }

        .resource-divider {
          opacity: 0.35;
        }

        .resource-actions {
          display: flex;
          gap: 7px;
          flex-shrink: 0;
        }

        .resource-action {
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.82);
          border-radius: 11px;
          padding: 9px 11px;
          cursor: pointer;
          transition: 0.2s ease;
          font-size: 12px;
          font-weight: 700;
        }

        .resource-action:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.15);
        }

        .resource-action.download {
          border-color: rgba(104,120,255,0.22);
          background: rgba(104,120,255,0.10);
        }

        .resource-action.delete {
          border-color: rgba(255,91,113,0.20);
          color: #ffb5c0;
          background: rgba(255,91,113,0.08);
        }

        .resources-empty {
          text-align: center;
          padding: 48px 18px;
          border-radius: 18px;
          background: rgba(255,255,255,0.025);
          border: 1px dashed rgba(255,255,255,0.08);
        }

        .resources-empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .resources-empty h3 {
          margin: 0;
          color: #ffffff;
        }

        .resources-empty p {
          margin: 7px auto 0;
          max-width: 380px;
          color: rgba(255,255,255,0.45);
          font-size: 13px;
          line-height: 1.6;
        }

        .resources-format-note {
          margin-top: 10px;
          color: rgba(255,255,255,0.38);
          font-size: 10px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .resources-hero {
            flex-direction: column;
            align-items: stretch;
          }

          .resources-stat-grid {
            min-width: 0;
          }

          .resources-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .resources-page {
            padding: 20px 14px 35px;
          }

          .resources-stat-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .resources-stat {
            padding: 11px 10px;
          }

          .resources-stat-value {
            font-size: 18px;
          }

          .resources-stat-label {
            font-size: 9px;
          }

          .resources-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .resources-search-wrap {
            min-width: 0;
          }

          .resource-item {
            align-items: flex-start;
          }

          .resource-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="resources-shell">

        {/* HERO */}
        <div className="resources-hero">
          <div>
            <div className="resources-eyebrow">
              📚 Learning Space
            </div>

            <h1>Resources</h1>

            <p>
              Share notes, projects, presentations and
              useful learning material with people you
              connect with on SkillSwap.
            </p>
          </div>

          <div className="resources-stat-grid">
            <div className="resources-stat">
              <div className="resources-stat-value">
                {connections.length}
              </div>

              <div className="resources-stat-label">
                Connections
              </div>
            </div>

            <div className="resources-stat">
              <div className="resources-stat-value">
                {resources.length}
              </div>

              <div className="resources-stat-label">
                Resources
              </div>
            </div>

            <div className="resources-stat">
              <div className="resources-stat-value">
                {formatFileSize(totalSize)}
              </div>

              <div className="resources-stat-label">
                Storage
              </div>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="resources-alert error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="resources-alert success">
            ✅ {success}
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="resources-main-grid">

          {/* UPLOAD */}
          <section className="resources-card">
            <div className="resources-card-header">
              <div>
                <h2>📤 Share a Resource</h2>

                <p className="resources-card-subtitle">
                  Send learning material directly to an
                  accepted SkillSwap connection.
                </p>
              </div>
            </div>

            {loadingConnections ? (
              <div className="resources-empty">
                <div className="resources-empty-icon">
                  ⏳
                </div>

                <h3>Loading connections</h3>

                <p>
                  Checking your accepted SkillSwap
                  connections...
                </p>
              </div>
            ) : connections.length === 0 ? (
              <div className="resources-empty">
                <div className="resources-empty-icon">
                  🤝
                </div>

                <h3>No connections yet</h3>

                <p>
                  Accept a skill-swap request before
                  sharing learning resources.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpload}>

                <label className="resources-label">
                  Share with
                </label>

                <select
                  className="resources-select"
                  value={selectedConnectionId}
                  onChange={(event) => {
                    setSelectedConnectionId(
                      event.target.value
                    );
                    clearMessages();
                  }}
                >
                  <option value="">
                    Select a connection
                  </option>

                  {connections.map((connection) => (
                    <option
                      key={connection.id}
                      value={String(connection.id)}
                    >
                      {connection.name} (
                      {connection.email})
                    </option>
                  ))}
                </select>

                {selectedConnection && (
                  <div className="resources-selected-user">
                    <div className="resources-avatar">
                      {selectedConnection.name
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>

                    <div>
                      <div className="resources-selected-user-name">
                        {selectedConnection.name}
                      </div>

                      <div className="resources-selected-user-email">
                        {selectedConnection.email}
                      </div>
                    </div>
                  </div>
                )}

                <label
                  className="resources-upload-dropzone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  style={{
                    display: "block",
                    marginTop: "17px",
                  }}
                >
                  <div className="resources-upload-icon">
                    ☁️
                  </div>

                  <div className="resources-upload-title">
                    {selectedFile
                      ? "File ready to share"
                      : "Choose or drop a file"}
                  </div>

                  <div className="resources-upload-description">
                    PDF, Word, PowerPoint, Excel,
                    images, TXT and CSV
                    <br />
                    Maximum size: 10 MB
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept={allowedExtensions.join(
                      ","
                    )}
                    onChange={handleFileChange}
                  />

                  {selectedFile && (
                    <div className="resources-upload-file">
                      <strong>
                        {getFileIcon(
                          selectedFile.name
                        )}{" "}
                        {selectedFile.name}
                      </strong>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          color:
                            "rgba(255,255,255,0.43)",
                        }}
                      >
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </div>
                    </div>
                  )}
                </label>

                <button
                  type="button"
                  className="resources-button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  📎 Choose File
                </button>

                <button
                  type="submit"
                  className="resources-button"
                  disabled={
                    uploading ||
                    !selectedConnectionId ||
                    !selectedFile
                  }
                  style={{
                    marginTop: "9px",
                  }}
                >
                  {uploading
                    ? "⏳ Uploading..."
                    : "🚀 Upload Resource"}
                </button>

                <div className="resources-format-note">
                  Your resource will only be shared with
                  the selected accepted connection.
                </div>
              </form>
            )}
          </section>

          {/* RESOURCE LIST */}
          <section className="resources-card">
            <div className="resources-card-header">
              <div>
                <h2>📂 Shared Resources</h2>

                <p className="resources-card-subtitle">
                  Learning materials shared between you
                  and your connections.
                </p>
              </div>

              <div className="resources-count">
                {resources.length}{" "}
                {resources.length === 1
                  ? "resource"
                  : "resources"}
              </div>
            </div>

            <div className="resources-toolbar">
              <div className="resources-search-wrap">
                <span className="resources-search-icon">
                  🔍
                </span>

                <input
                  className="resources-search"
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            {loadingResources ? (
              <div className="resources-empty">
                <div className="resources-empty-icon">
                  ⏳
                </div>

                <h3>Loading resources</h3>

                <p>
                  Fetching your shared learning material...
                </p>
              </div>
            ) : filteredResources.length ===
              0 ? (
              <div className="resources-empty">
                <div className="resources-empty-icon">
                  {searchTerm ? "🔍" : "📂"}
                </div>

                <h3>
                  {searchTerm
                    ? "No matching resources"
                    : "No resources yet"}
                </h3>

                <p>
                  {searchTerm
                    ? "Try a different file name."
                    : "Upload your first learning resource and start sharing knowledge."}
                </p>
              </div>
            ) : (
              <div className="resources-list">

                {filteredResources.map(
                  (resource) => {
                    const isOwned =
                      ownedResourceIds.has(
                        resource.id
                      );

                    return (
                      <div
                        className="resource-item"
                        key={resource.id}
                      >
                        <div className="resource-file-icon">
                          {getFileIcon(
                            resource.fileName
                          )}
                        </div>

                        <div className="resource-content">
                          <div
                            className="resource-name"
                            title={
                              resource.fileName
                            }
                          >
                            {resource.fileName}
                          </div>

                          <div className="resource-meta">
                            <span className="resource-owner">
                              {isOwned
                                ? "You"
                                : getUploaderName(
                                    resource
                                  )}
                            </span>

                            <span className="resource-divider">
                              •
                            </span>

                            <span>
                              {formatFileSize(
                                resource.fileSize
                              )}
                            </span>

                            <span className="resource-divider">
                              •
                            </span>

                            <span>
                              {formatDate(
                                resource.uploadedAt
                              )}
                            </span>

                            {isOwned && (
                              <>
                                <span className="resource-divider">
                                  •
                                </span>

                                <span
                                  style={{
                                    color:
                                      "#9fa9ff",
                                  }}
                                >
                                  Your upload
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="resource-actions">
                          <button
                            type="button"
                            className="resource-action download"
                            onClick={() =>
                              handleDownload(
                                resource.id
                              )
                            }
                          >
                            ⬇️
                          </button>

                          {isOwned && (
                            <button
                              type="button"
                              className="resource-action delete"
                              onClick={() =>
                                handleDelete(
                                  resource.id
                                )
                              }
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}

              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

export default Resources;