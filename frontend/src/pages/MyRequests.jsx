import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import api from "../services/api";

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMyRequests().then((response) => setRequests(response.data || []))
      .catch((requestError) => setError(requestError.message || "Unable to load requests."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="container page"><Loading text="Loading your requests..." /></main>;

  return <main className="container page">
    <div className="page-header"><span className="eyebrow">EMERGENCY REQUESTS</span><h1>My Requests</h1><p>Track the status and any provider response to your emergency requests.</p></div>
    {error && <div className="alert error">{error}</div>}
    {requests.length === 0 ? <div className="empty-state"><div>📋</div><h2>No requests yet</h2><p>Your emergency requests will appear here.</p></div> : <div className="request-list">{requests.map((request) => <article className="request-item" key={request.id}><div><span className="category-badge">{request.resource.category.replaceAll("_", " ")}</span><h3>{request.resource.name}</h3><p>Provider: {request.resource.provider.organization}</p><p>Quantity: {request.quantity}</p><p>Submitted: {new Date(request.createdAt).toLocaleString()}</p>{request.message && <p>Your message: {request.message}</p>}{request.rejectionReason && <div className="alert error"><strong>Provider's rejection reason:</strong> {request.rejectionReason}</div>}</div><div className="request-status"><span className={`status status-${request.status.toLowerCase()}`}>{request.status}</span><span>Priority: {request.priority}</span></div></article>)}</div>}
  </main>;
};

export default MyRequests;
