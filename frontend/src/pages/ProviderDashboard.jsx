import { useEffect, useState } from "react";
import api from "../services/api";
import Loading from "../components/Loading";

const categories = ["BLOOD", "HOSPITAL_BED", "MEDICINE", "AMBULANCE", "SHELTER", "FOOD", "WATER"];
const emptyResource = { name: "", category: "BLOOD", quantity: 0, available: true, city: "", address: "", description: "" };
const readDocument = (file) => new Promise((resolve, reject) => {
  if (!file) return reject(new Error("Select an authorization document."));
  if (!/[.]pdf$/i.test(file.name) && !["image/jpeg", "image/png"].includes(file.type)) {
    return reject(new Error("Document must be PDF, JPG or PNG."));
  }
  if (file.size > 4 * 1024 * 1024) return reject(new Error("Document must be 4 MB or smaller."));
  const reader = new FileReader();
  reader.onload = () => resolve({ documentBase64: String(reader.result).split(",")[1], documentName: file.name, documentMimeType: file.type || "application/pdf" });
  reader.onerror = () => reject(new Error("Unable to read the selected document."));
  reader.readAsDataURL(file);
});

const ProviderDashboard = () => {
  const [provider, setProvider] = useState(null);
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [providerForm, setProviderForm] = useState({ organization: "", type: "", city: "", address: "", phone: "" });
  const [resourceForm, setResourceForm] = useState(emptyResource);
  const [documentFile, setDocumentFile] = useState(null);
  const [editingResourceId, setEditingResourceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboard = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      let currentProvider = null;
      try {
        const response = await api.getMyProvider();
        currentProvider = response.data;
      } catch (providerError) {
        if (!providerError.message.includes("Provider profile not found")) throw providerError;
      }
      setProvider(currentProvider);
      setResources(currentProvider?.resources || []);
      if (currentProvider) {
        try {
          const requestResponse = await api.getProviderRequests();
          setRequests(requestResponse.data || []);
        } catch (requestError) {
          setRequests([]);
          setError(requestError.message || "Unable to load incoming requests.");
        }
      } else {
        setRequests([]);
      }
    } catch (loadError) {
      setError(loadError.message || "Unable to load provider dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(true); }, []);

  const handleProviderChange = (event) => setProviderForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const handleResourceChange = (event) => {
    const { name, value, type, checked } = event.target;
    setResourceForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
  };

  const createProvider = async (event) => {
    event.preventDefault(); setSubmitting(true); setError(""); setSuccess("");
    try {
      const document = await readDocument(documentFile);
      await api.createProvider({ ...providerForm, ...document });
      setSuccess("Provider profile and authorization document submitted. Admin review is pending.");
      setDocumentFile(null);
      await loadDashboard();
    } catch (submitError) { setError(submitError.message); }
    finally { setSubmitting(false); }
  };

  const resubmitDocument = async (event) => {
    event.preventDefault(); setSubmitting(true); setError(""); setSuccess("");
    try {
      const document = await readDocument(documentFile);
      await api.updateProviderDocument(document);
      setSuccess("New document submitted. Your profile is pending admin review.");
      setDocumentFile(null);
      await loadDashboard();
    } catch (submitError) { setError(submitError.message); }
    finally { setSubmitting(false); }
  };

  const saveResource = async (event) => {
    event.preventDefault(); setSubmitting(true); setError(""); setSuccess("");
    try {
      const payload = { ...resourceForm, quantity: Number(resourceForm.quantity) };
      if (editingResourceId) {
        await api.updateResource(editingResourceId, payload);
        setSuccess("Resource updated successfully.");
      } else {
        await api.createResource(payload);
        setSuccess("Resource added successfully.");
      }
      setResourceForm({ ...emptyResource, city: provider?.city || "" });
      setEditingResourceId(null);
      await loadDashboard();
    } catch (submitError) { setError(submitError.message); }
    finally { setSubmitting(false); }
  };

  const startEditing = (resource) => {
    setEditingResourceId(resource.id);
    setResourceForm({ name: resource.name, category: resource.category, quantity: resource.quantity, available: resource.available, city: resource.city, address: resource.address || "", description: resource.description || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteResource = async (resource) => {
    if (!window.confirm(`Delete resource “${resource.name}”? Existing requests associated with this resource may also be deleted.`)) return;
    setError(""); setSuccess("");
    try { await api.deleteResource(resource.id); setSuccess("Resource deleted."); await loadDashboard(); }
    catch (deleteError) { setError(deleteError.message); }
  };

  const updateRequest = async (requestId, status) => {
    let reason = "";
    if (status === "REJECTED") {
      reason = window.prompt("Enter the reason for rejecting this request (required):", "")?.trim() || "";
      if (reason.length < 5) { setError("Please provide a rejection reason of at least 5 characters."); return; }
    }
    setError(""); setSuccess("");
    try { await api.updateRequestStatus(requestId, status, reason); setSuccess(`Request ${status.toLowerCase()}.`); await loadDashboard(); }
    catch (updateError) { setError(updateError.message); }
  };

  if (loading) return <main className="container page"><Loading text="Loading provider dashboard..." /></main>;

  return (
    <main className="container page">
      <div className="page-header"><span className="eyebrow">PROVIDER PORTAL</span><h1>Provider Dashboard</h1><p>Manage your verification, resources and citizen requests.</p></div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {success && <div className="alert success" role="status">{success}</div>}

      {!provider ? (
        <section className="dashboard-section">
          <div className="section-heading"><span>STEP 1</span><h2>Create provider profile</h2></div>
          <p>Upload an official registration or authorization document. PDF, JPG and PNG files up to 4 MB are stored in the database for admin review.</p>
          <form className="form-grid" onSubmit={createProvider}>
            <label>Organization<input name="organization" value={providerForm.organization} onChange={handleProviderChange} required placeholder="City Hospital / NGO" /></label>
            <label>Provider Type<input name="type" value={providerForm.type} onChange={handleProviderChange} required placeholder="Hospital / NGO / Blood Bank" /></label>
            <label>City<input name="city" value={providerForm.city} onChange={handleProviderChange} required placeholder="Pune" /></label>
            <label>Phone<input name="phone" value={providerForm.phone} onChange={handleProviderChange} placeholder="Contact number" /></label>
            <label className="full-width">Address<input name="address" value={providerForm.address} onChange={handleProviderChange} placeholder="Full address" /></label>
            <label className="full-width">Authorization / registration document<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} required /></label>
            <button className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit Profile for Verification"}</button>
          </form>
        </section>
      ) : (
        <>
          <section className="provider-summary">
              <div><span>Organization</span><strong>{provider.organization}</strong></div>
              <div><span>City</span><strong>{provider.city}</strong></div>
              <div><span>Verification</span><strong>{provider.verificationStatus || (provider.verified ? "APPROVED" : "PENDING")}</strong></div>
              <div><span>Resources</span><strong>{resources.length}</strong></div>
            </section>
            {provider.verificationStatus === "REJECTED" && <div className="alert error"><strong>Profile rejected:</strong> {provider.verificationRejectionReason || "Please upload a corrected authorization document."}</div>}
            {provider.verificationStatus !== "APPROVED" && (
              <section className="dashboard-section">
                <h2>{provider.verificationStatus === "REJECTED" ? "Resubmit authorization document" : "Verification in progress"}</h2>
                {provider.verificationStatus !== "REJECTED" && <p>Your resources cannot be published until an admin verifies your profile.</p>}
                <p>Current document: {provider.verificationDocumentName || "No document on record"}</p>
                <form className="form-grid" onSubmit={resubmitDocument}>
                  <label className="full-width">Replacement document (PDF, JPG or PNG, up to 4 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} required /></label>
                  <button className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit Document for Review"}</button>
                </form>
              </section>
          )}

          {provider.verified && (
            <section className="dashboard-section">
                <div className="section-heading"><span>RESOURCE MANAGEMENT</span><h2>{editingResourceId ? "Edit resource" : "Add emergency resource"}</h2></div>
                <form className="form-grid" onSubmit={saveResource}>
                  <label>Resource Name<input name="name" value={resourceForm.name} onChange={handleResourceChange} required /></label>
                  <label>Category<select name="category" value={resourceForm.category} onChange={handleResourceChange}>{categories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></label>
                  <label>Quantity<input type="number" min="0" name="quantity" value={resourceForm.quantity} onChange={handleResourceChange} required /></label>
                  <label>City<input name="city" value={resourceForm.city} onChange={handleResourceChange} required /></label>
                  <label className="full-width">Address<input name="address" value={resourceForm.address} onChange={handleResourceChange} /></label>
                  <label className="full-width">Description<textarea name="description" value={resourceForm.description} onChange={handleResourceChange} rows="3" /></label>
                  <label className="checkbox-label"><input type="checkbox" name="available" checked={resourceForm.available} onChange={handleResourceChange} /> Currently available</label>
                  <div className="form-actions"><button className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : editingResourceId ? "Save Changes" : "Add Resource"}</button>{editingResourceId && <button type="button" className="btn btn-outline" onClick={() => { setEditingResourceId(null); setResourceForm({ ...emptyResource, city: provider.city }); }}>Cancel Edit</button>}</div>
              </form>
            </section>
          )}

          <section className="dashboard-section">
              <div className="section-heading"><span>YOUR INVENTORY</span><h2>Resources ({resources.length})</h2></div>
              {resources.length === 0 ? <div className="empty-state"><h3>No resources added yet</h3><p>Verified providers can add resources using the form above.</p></div> : <div className="resource-grid">{resources.map((resource) => <article className="resource-card" key={resource.id}><span className="category-badge">{resource.category.replaceAll("_", " ")}</span><h3>{resource.name}</h3><p>Quantity: {resource.quantity}</p><p>Status: {resource.available ? "Available" : "Unavailable"}</p>{provider.verified && <div className="resource-actions"><button className="btn btn-outline" onClick={() => startEditing(resource)}>Edit</button><button className="btn btn-danger" onClick={() => deleteResource(resource)}>Delete</button><button className="btn btn-outline" onClick={async () => { try { await api.updateResource(resource.id, { quantity: resource.quantity, available: !resource.available }); await loadDashboard(); } catch (e) { setError(e.message); } }}>{resource.available ? "Mark unavailable" : "Mark available"}</button></div>}</article>)}</div>}
          </section>

            <section className="dashboard-section" id="incoming-requests">
              <div className="section-heading"><span>EMERGENCY REQUESTS</span><h2>Incoming citizen requests ({requests.length})</h2></div>
              {requests.length === 0 ? <div className="empty-state"><div>📭</div><h3>No incoming requests</h3><p>New requests for your resources will appear here.</p></div> : <div className="request-list">{requests.map((request) => <article className="request-item" key={request.id}><div><span className="category-badge">{request.priority}</span><h3>{request.resource.name}</h3><p>Requested by: {request.user.name} ({request.user.email})</p><p>Quantity: {request.quantity}</p><p>Message: {request.message || "No message"}</p><p>Submitted: {new Date(request.createdAt).toLocaleString()}</p>{request.rejectionReason && <p><strong>Rejection reason:</strong> {request.rejectionReason}</p>}</div><div className="request-actions"><span className={`status status-${request.status.toLowerCase()}`}>{request.status}</span>{request.status === "PENDING" && <><button className="btn btn-primary" onClick={() => updateRequest(request.id, "ACCEPTED")}>Accept</button><button className="btn btn-danger" onClick={() => updateRequest(request.id, "REJECTED")}>Reject</button></>}{request.status === "ACCEPTED" && <button className="btn btn-outline" onClick={() => updateRequest(request.id, "COMPLETED")}>Mark completed</button>}</div></article>)}</div>}
          </section>
        </>
      )}
    </main>
  );
};

export default ProviderDashboard;
