import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Table, Form, Alert, ProgressBar, Breadcrumb, Modal, ButtonGroup, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { user, token, logout } = useContext(AuthContext);

  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolder = searchParams.get('folder') || null;
  const viewMode = searchParams.get('view') || 'post'; // Default to 'post' as per preference

  const [folderStack, setFolderStack] = useState([{ id: null, name: 'Home' }]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (currentFolder === null) {
        setFolderStack([{ id: null, name: 'Home' }]);
    }
  }, [currentFolder]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/files/list', {
        headers: { Authorization: `Bearer ${token}` },
        params: { parent_id: currentFolder }
      });
      setFiles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [currentFolder, token]);

  const navigateToFolder = (folderId, folderName) => {
      const newParams = { view: viewMode };
      if (folderId) newParams.folder = folderId;
      setSearchParams(newParams);
      setFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index) => {
      const targetFolder = folderStack[index];
      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);

      const newParams = { view: viewMode };
      if (targetFolder.id) newParams.folder = targetFolder.id;
      setSearchParams(newParams);
  };

  const toggleView = (mode) => {
      const newParams = { view: mode };
      if (currentFolder) newParams.folder = currentFolder;
      setSearchParams(newParams);
  }

  const uploadFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
    }
    formData.append('parent_id', currentFolder);

    setUploading(true);
    try {
      await axios.post('http://localhost:5000/api/files/upload', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      fetchFiles();
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => { uploadFiles(e.target.files); e.target.value = null; };
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => { e.preventDefault(); setIsDragging(false); uploadFiles(e.dataTransfer.files); };

  const handleCreateFolder = async () => {
      if(!newFolderName.trim()) return;
      try {
          await axios.post('http://localhost:5000/api/files/create-folder', { name: newFolderName, parent_id: currentFolder }, { headers: { Authorization: `Bearer ${token}` } });
          setNewFolderName('');
          setShowCreateFolder(false);
          fetchFiles();
      } catch (err) {}
  }

  const handleDelete = async (fileId) => {
      if(!window.confirm("Really delete this file?")) return;
      try {
          await axios.delete(`http://localhost:5000/api/files/delete/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
          fetchFiles();
          setPreviewFile(null);
      } catch (error) {}
  }

  const handleDownload = async (fileId, fileName) => {
    try {
        const response = await axios.get(`http://localhost:5000/api/files/download/${fileId}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
    } catch (error) {}
};

  const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
  }

  // --- 1. POST VIEW (Gallery) ---
  const renderPostView = () => (
    <div className="d-flex flex-column gap-5 py-4">
        {files.map(file => (
            <div key={file.id} className="d-flex justify-content-center position-relative group-action-container">
                {/* Delete Button (Visible on Hover or nice placement) */}
                <div className="position-absolute top-0 end-0 translate-middle-y me-2" style={{zIndex: 10, maxWidth: '600px', width:'100%', display:'flex', justifyContent:'flex-end'}}>
                     <Button variant="danger" size="sm" className="shadow rounded-circle" style={{width:'32px', height:'32px', padding:0}} onClick={(e) => {e.stopPropagation(); handleDelete(file.id);}} title="Delete">
                        🗑️
                     </Button>
                </div>

                {file.is_folder ? (
                     <div 
                        className="p-5 border rounded bg-light text-center shadow-sm" 
                        style={{width: '100%', maxWidth: '600px', cursor: 'pointer'}}
                        onClick={() => navigateToFolder(file.id, file.original_name)}
                     >
                        <h1 style={{fontSize: '4rem'}}>📁</h1>
                        <h4 className="mt-2">{file.original_name}</h4>
                     </div>
                ) : isImage(file.original_name) ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'center' }}>
                        <img 
                            src={`http://localhost:5000/api/files/content/${file.id}?token=${token}`} 
                            alt={file.original_name}
                            style={{ width: '100%', height: 'auto', maxHeight: '85vh', objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px' }}
                            onClick={() => setPreviewFile(file)}
                            onError={(e) => { e.target.style.display='none'; }}
                        />
                    </div>
                ) : (
                    <div className="p-4 border rounded text-center bg-white shadow-sm" style={{width: '200px'}}>
                        <h3>📄</h3>
                        <div className="text-truncate" style={{maxWidth: '180px'}}>{file.original_name}</div>
                        <Button size="sm" variant="link" onClick={() => handleDownload(file.id, file.original_name)}>Download</Button>
                    </div>
                )}
            </div>
        ))}
    </div>
  );

  // --- 2. LIST VIEW (Management) ---
  const renderListView = () => (
    <div className="bg-white rounded shadow-sm p-3">
        <Table hover responsive className="align-middle mb-0">
            <thead className="bg-light">
                <tr>
                    <th style={{width: '50px'}}>Type</th>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
                {files.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-5 text-muted">No files in this folder</td></tr>
                ) : files.map(file => (
                    <tr key={file.id}>
                        <td className="text-center fs-5">
                            {file.is_folder ? '📁' : isImage(file.original_name) ? '🖼️' : '📄'}
                        </td>
                        <td>
                             {file.is_folder ? (
                                <span 
                                    className="text-primary fw-bold text-decoration-none" 
                                    style={{cursor: 'pointer'}}
                                    onClick={() => navigateToFolder(file.id, file.original_name)}
                                >
                                    {file.original_name}
                                </span>
                             ) : (
                                 file.original_name
                             )}
                        </td>
                        <td>{file.is_folder ? '-' : formatBytes(file.size)}</td>
                        <td>{new Date(file.upload_date).toLocaleDateString()}</td>
                        <td className="text-end">
                            {!file.is_folder && (
                                <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleDownload(file.id, file.original_name)}>
                                    ⬇
                                </Button>
                            )}
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(file.id)}>
                                🗑️
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </div>
  );

  return (
    <div 
        onDragOver={onDragOver} 
        onDragLeave={onDragLeave} 
        onDrop={onDrop}
        style={{minHeight: '100vh', backgroundColor: '#f8f9fa'}}
    >
      {/* Header & Toolbar */}
      <div className="bg-white px-4 py-3 border-bottom sticky-top shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3" style={{zIndex: 1000}}>
        
        {/* Left: Branding & Breadcrumbs */}
        <div className="d-flex align-items-center gap-3">
             <h4 className="m-0 fw-bold text-dark me-2">My Drive</h4>
             <ButtonGroup size="sm">
                {folderStack.length > 1 && (
                     <Button variant="outline-secondary" onClick={() => navigateToBreadcrumb(folderStack.length - 2)}>
                         ←
                     </Button>
                )}
                <div className="d-flex align-items-center px-2 border rounded-end border-start-0 bg-light text-muted small">
                    {folderStack.map(f => f.name).join(' / ')}
                </div>
             </ButtonGroup>
        </div>

        {/* Right: View Modes & Actions */}
        <div className="d-flex align-items-center gap-2">
            <ButtonGroup className="me-3">
                <Button variant={viewMode === 'list' ? 'secondary' : 'outline-secondary'} onClick={() => toggleView('list')}>≡ List</Button>
                <Button variant={viewMode === 'post' ? 'primary' : 'outline-primary'} onClick={() => toggleView('post')}>🖼️ Post</Button>
            </ButtonGroup>

            <Button variant="success" onClick={() => setShowCreateFolder(true)}>+ Folder</Button>
            <Form.Control type="file" multiple onChange={handleFileChange} style={{width: '200px'}} />
            <Button variant="outline-danger" onClick={logout}>Exit</Button>
        </div>
      </div>

      {uploading && <ProgressBar animated now={100} className="fixed-top" style={{height: '4px', zIndex: 1050}} />}

      {/* Main Content */}
      <div className="container py-4">
          {renderPostView && viewMode === 'post' ? (
               files.length === 0 ? <div className="text-center mt-5 text-muted">Drop files here</div> : renderPostView()
          ) : (
               renderListView()
          )}
      </div>

      {/* Modals */}
      <Modal show={!!previewFile} onHide={() => setPreviewFile(null)} size="lg" centered>
        <Modal.Body className="p-0 bg-dark text-center position-relative">
             <Button variant="danger" className="position-absolute top-0 end-0 m-3" onClick={() => handleDelete(previewFile.id)}>Delete</Button>
             <Button variant="primary" className="position-absolute top-0 start-0 m-3" onClick={() => handleDownload(previewFile.id, previewFile.original_name)}>Download</Button>
             {previewFile && (
                 <img 
                    src={`http://localhost:5000/api/files/content/${previewFile.id}?token=${token}`} 
                    style={{maxWidth: '100%', maxHeight: '90vh'}} 
                 />
             )}
        </Modal.Body>
      </Modal>

      <Modal show={showCreateFolder} onHide={() => setShowCreateFolder(false)} centered>
        <Modal.Body>
          <Form.Control 
            type="text" 
            placeholder="New Folder Name" 
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
        </Modal.Body>
        <Modal.Footer className="p-1 border-0 justify-content-center">
            <Button variant="primary" className="w-100" onClick={handleCreateFolder}>Create</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}
