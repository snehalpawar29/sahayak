import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Loading from "../components/Loading";

const resourceOptions = {
    BLOOD: [
        "A+ Blood",
        "A- Blood",
        "B+ Blood",
        "B- Blood",
        "AB+ Blood",
        "AB- Blood",
        "O+ Blood",
        "O- Blood"
    ],

    HOSPITAL_BED: [
        "General Bed",
        "ICU Bed",
        "Emergency Bed",
        "Pediatric Bed",
        "Isolation Bed",
        "Ventilator Bed"
    ],

    MEDICINE: [
        "Paracetamol",
        "Antibiotics",
        "ORS",
        "Insulin",
        "Pain Relief Medicine",
        "Emergency Medicine Kit"
    ],

    AMBULANCE: [
        "Basic Ambulance",
        "Advanced Life Support Ambulance",
        "Patient Transport Ambulance",
        "Neonatal Ambulance"
    ],

    SHELTER: [
        "Emergency Shelter",
        "Temporary Shelter",
        "Family Shelter",
        "Women and Children Shelter"
    ],

    FOOD: [
        "Ready-to-Eat Meals",
        "Food Packets",
        "Dry Ration Kit",
        "Emergency Meal Kit"
    ],

    WATER: [
        "Drinking Water Bottles",
        "Water Can",
        "Emergency Water Kit",
        "Water Tanker"
    ]
};

const categories = [
    ["BLOOD", "Blood"],
    ["HOSPITAL_BED", "Hospital Beds"],
    ["MEDICINE", "Medicine"],
    ["AMBULANCE", "Ambulance"],
    ["SHELTER", "Shelter"],
    ["FOOD", "Food"],
    ["WATER", "Water"]
];

const ProviderDashboard = () => {
    const { user } = useAuth();

    const [provider, setProvider] = useState(null);
    const [resources, setResources] = useState([]);
    const [requests, setRequests] = useState([]);

    const [providerForm, setProviderForm] = useState({
        organization: "",
        type: "",
        city: "",
        address: "",
        phone: ""
    });

    const [resourceForm, setResourceForm] = useState({
        category: "BLOOD",
        name: resourceOptions.BLOOD[0],
        quantity: 0,
        available: true,
        city: "",
        address: "",
        description: ""
    });

    const [quantityDrafts, setQuantityDrafts] = useState({});

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updatingResourceId, setUpdatingResourceId] =
        useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadDashboard = async () => {
        try {
            setError("");

            const providerResponse =
                await api.getProviderDashboard();

            const currentProvider =
                providerResponse.data?.provider || null;

            setProvider(currentProvider);

            if (currentProvider) {
                const currentResources =
                    currentProvider.resources || [];

                setResources(currentResources);

                setQuantityDrafts(
                    Object.fromEntries(
                        currentResources.map((resource) => [
                            resource.id,
                            resource.quantity
                        ])
                    )
                );

                if (!resourceForm.city) {
                    setResourceForm((current) => ({
                        ...current,
                        city: currentProvider.city || ""
                    }));
                }
            } else {
                setResources([]);
            }

            try {
                const requestResponse =
                    await api.getProviderRequests();

                setRequests(
                    requestResponse.data || []
                );
            } catch {
                setRequests([]);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadDashboard();
        }
    }, [user]);

    const handleProviderChange = (event) => {
        setProviderForm((current) => ({
            ...current,
            [event.target.name]: event.target.value
        }));
    };

    const handleResourceChange = (event) => {
        const {
            name,
            value,
            type,
            checked
        } = event.target;

        setResourceForm((current) => ({
            ...current,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };

    const handleCategoryChange = (event) => {
        const category = event.target.value;

        setResourceForm((current) => ({
            ...current,
            category,
            name: resourceOptions[category][0]
        }));
    };

    const createProvider = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            await api.createProvider(providerForm);

            setSuccess(
                "Provider profile created. Waiting for administrator verification."
            );

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const createResource = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const quantity =
                Number(resourceForm.quantity);

            await api.createResource({
                ...resourceForm,
                quantity,
                available:
                    quantity > 0 &&
                    resourceForm.available
            });

            setSuccess(
                "Resource added successfully."
            );

            setResourceForm({
                category: "BLOOD",
                name: resourceOptions.BLOOD[0],
                quantity: 0,
                available: true,
                city: provider?.city || "",
                address: "",
                description: ""
            });

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuantityChange = (
        resourceId,
        value
    ) => {
        setQuantityDrafts((current) => ({
            ...current,
            [resourceId]: value
        }));
    };

    const updateQuantity = async (resource) => {
        const quantity = Number(
            quantityDrafts[resource.id]
        );

        if (
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            setError(
                "Quantity must be a non-negative integer."
            );
            return;
        }

        setUpdatingResourceId(resource.id);
        setError("");
        setSuccess("");

        try {
            await api.updateResource(
                resource.id,
                {
                    quantity
                }
            );

            setSuccess(
                `${resource.name} quantity updated to ${quantity}.`
            );

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        } finally {
            setUpdatingResourceId(null);
        }
    };

    const updateAvailability = async (
        resource
    ) => {
        if (Number(resource.quantity) === 0) {
            setError(
                "A resource with quantity 0 cannot be marked available."
            );
            return;
        }

        setUpdatingResourceId(resource.id);
        setError("");
        setSuccess("");

        try {
            await api.updateResource(
                resource.id,
                {
                    available:
                        !resource.available
                }
            );

            setSuccess(
                resource.available
                    ? `${resource.name} marked unavailable.`
                    : `${resource.name} marked available.`
            );

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        } finally {
            setUpdatingResourceId(null);
        }
    };

    const updateRequest = async (
        requestId,
        status
    ) => {
        setError("");
        setSuccess("");

        try {
            await api.updateRequestStatus(
                requestId,
                status
            );

            setSuccess(
                `Request ${status.toLowerCase()} successfully.`
            );

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        }
    };

    if (loading) {
        return (
            <main className="container page">
                <Loading text="Loading provider dashboard..." />
            </main>
        );
    }

    return (
        <main className="container page">
            <div className="page-header">
                <span className="eyebrow">
                    PROVIDER PORTAL
                </span>

                <h1>Provider Dashboard</h1>

                <p>
                    Manage emergency resources and incoming
                    requests.
                </p>
            </div>

            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}

            {success && (
                <div className="alert success">
                    {success}
                </div>
            )}

            {!provider ? (
                <section className="dashboard-section">
                    <div className="section-heading">
                        <span>STEP 1</span>
                        <h2>
                            Create provider profile
                        </h2>
                    </div>

                    <form
                        className="form-grid"
                        onSubmit={createProvider}
                    >
                        <label>
                            Organization
                            <input
                                name="organization"
                                value={
                                    providerForm.organization
                                }
                                onChange={handleProviderChange}
                                required
                                placeholder="City Hospital"
                            />
                        </label>

                        <label>
                            Provider Type
                            <input
                                name="type"
                                value={
                                    providerForm.type
                                }
                                onChange={handleProviderChange}
                                required
                                placeholder="Hospital / NGO / Blood Bank"
                            />
                        </label>

                        <label>
                            City
                            <input
                                name="city"
                                value={
                                    providerForm.city
                                }
                                onChange={handleProviderChange}
                                required
                                placeholder="Pune"
                            />
                        </label>

                        <label>
                            Phone
                            <input
                                name="phone"
                                value={
                                    providerForm.phone
                                }
                                onChange={handleProviderChange}
                                placeholder="+91..."
                            />
                        </label>

                        <label className="full-width">
                            Address
                            <input
                                name="address"
                                value={
                                    providerForm.address
                                }
                                onChange={handleProviderChange}
                                placeholder="Full address"
                            />
                        </label>

                        <button
                            className="btn btn-primary"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Creating..."
                                : "Create Provider Profile"}
                        </button>
                    </form>
                </section>
            ) : (
                <>
                    <section className="provider-summary">
                        <div>
                            <span>Organization</span>

                            <strong>
                                {provider.organization}
                            </strong>
                        </div>

                        <div>
                            <span>City</span>

                            <strong>
                                {provider.city}
                            </strong>
                        </div>

                        <div>
                            <span>Verification</span>

                            <strong>
                                {provider.verified
                                    ? "✓ Verified"
                                    : "⏳ Pending"}
                            </strong>
                        </div>

                        <div>
                            <span>Resources</span>

                            <strong>
                                {resources.length}
                            </strong>
                        </div>
                    </section>

                    {!provider.verified && (
                        <div className="alert warning">
                            Your provider account is awaiting
                            verification. Resource management will
                            become available after verification.
                        </div>
                    )}

                    {provider.verified && (
                        <>
                            {/* ADD RESOURCE */}
                            <section className="dashboard-section">
                                <div className="section-heading">
                                    <span>STEP 2</span>

                                    <h2>
                                        Add emergency resource
                                    </h2>
                                </div>

                                <form
                                    className="form-grid"
                                    onSubmit={createResource}
                                >
                                    {/* AVAILABILITY SWITCH */}
                                    <label className="checkbox-label full-width">
                                        <input
                                            type="checkbox"
                                            name="available"
                                            checked={
                                                Number(
                                                    resourceForm.quantity
                                                ) > 0 &&
                                                resourceForm.available
                                            }
                                            disabled={
                                                Number(
                                                    resourceForm.quantity
                                                ) === 0
                                            }
                                            onChange={
                                                handleResourceChange
                                            }
                                        />

                                        Currently available
                                    </label>

                                    {/* CATEGORY */}
                                    <label>
                                        Category

                                        <select
                                            name="category"
                                            value={
                                                resourceForm.category
                                            }
                                            onChange={
                                                handleCategoryChange
                                            }
                                            required
                                        >
                                            {categories.map(
                                                ([
                                                    value,
                                                    label
                                                ]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>

                                    {/* RESOURCE NAME */}
                                    <label>
                                        Resource Name

                                        <select
                                            name="name"
                                            value={
                                                resourceForm.name
                                            }
                                            onChange={
                                                handleResourceChange
                                            }
                                            required
                                        >
                                            {(
                                                resourceOptions[
                                                    resourceForm.category
                                                ] || []
                                            ).map(
                                                (
                                                    resourceName
                                                ) => (
                                                    <option
                                                        key={
                                                            resourceName
                                                        }
                                                        value={
                                                            resourceName
                                                        }
                                                    >
                                                        {
                                                            resourceName
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>

                                    {/* QUANTITY */}
                                    <label>
                                        Quantity

                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            name="quantity"
                                            value={
                                                resourceForm.quantity
                                            }
                                            onChange={
                                                handleResourceChange
                                            }
                                            required
                                        />
                                    </label>

                                    {/* CITY */}
                                    <label>
                                        City

                                        <input
                                            name="city"
                                            value={
                                                resourceForm.city
                                            }
                                            onChange={
                                                handleResourceChange
                                            }
                                            required
                                        />
                                    </label>

                                    {/* ADDRESS */}
                                    <label className="full-width">
                                        Address

                                        <input
                                            name="address"
                                            value={
                                                resourceForm.address
                                            }
                                            onChange={
                                                handleResourceChange
                                            }
                                            placeholder="Resource location"
                                        />
                                    </label>

                                    {/* DESCRIPTION */}
                                    <label className="full-width">
                                        Description

                                        <textarea
                                            name="description"
                                            value={
                                                resourceForm.description
                                            }
                                            onChange={
                                                handleResourceChange
                                            }
                                            rows="3"
                                            placeholder="Add additional emergency resource information..."
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={
                                            submitting
                                        }
                                    >
                                        {submitting
                                            ? "Adding..."
                                            : "Add Resource"}
                                    </button>
                                </form>
                            </section>

                            {/* RESOURCE MANAGEMENT */}
                            <section className="dashboard-section">
                                <div className="section-heading">
                                    <span>
                                        RESOURCE MANAGEMENT
                                    </span>

                                    <h2>
                                        Quantity & availability
                                    </h2>
                                </div>

                                {resources.length === 0 ? (
                                    <div className="empty-state">
                                        <div>📦</div>

                                        <h3>
                                            No resources added yet
                                        </h3>

                                        <p>
                                            Add your first emergency
                                            resource above.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="resource-grid">
                                        {resources.map(
                                            (resource) => (
                                                <article
                                                    className="resource-card"
                                                    key={
                                                        resource.id
                                                    }
                                                >
                                                    <span className="category-badge">
                                                        {resource.category.replaceAll(
                                                            "_",
                                                            " "
                                                        )}
                                                    </span>

                                                    <h3>
                                                        {
                                                            resource.name
                                                        }
                                                    </h3>

                                                    <p>
                                                        Current
                                                        quantity:{" "}
                                                        <strong>
                                                            {
                                                                resource.quantity
                                                            }
                                                        </strong>
                                                    </p>

                                                    <p>
                                                        Status:{" "}
                                                        <strong>
                                                            {resource.available
                                                                ? "Available"
                                                                : "Unavailable"}
                                                        </strong>
                                                    </p>

                                                    <label>
                                                        Edit quantity

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={
                                                                quantityDrafts[
                                                                    resource
                                                                        .id
                                                                ] ??
                                                                resource.quantity
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                handleQuantityChange(
                                                                    resource.id,
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-full"
                                                        disabled={
                                                            updatingResourceId ===
                                                            resource.id
                                                        }
                                                        onClick={() =>
                                                            updateQuantity(
                                                                resource
                                                            )
                                                        }
                                                    >
                                                        {updatingResourceId ===
                                                        resource.id
                                                            ? "Updating..."
                                                            : "Save Quantity"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-full"
                                                        disabled={
                                                            updatingResourceId ===
                                                                resource.id ||
                                                            Number(
                                                                resource.quantity
                                                            ) === 0
                                                        }
                                                        onClick={() =>
                                                            updateAvailability(
                                                                resource
                                                            )
                                                        }
                                                    >
                                                        {resource.available
                                                            ? "Mark Unavailable"
                                                            : "Mark Available"}
                                                    </button>

                                                    {Number(
                                                        resource.quantity
                                                    ) === 0 && (
                                                        <small>
                                                            Quantity is 0, so
                                                            this resource is
                                                            automatically
                                                            unavailable.
                                                        </small>
                                                    )}
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* REQUESTS */}
                            <section className="dashboard-section">
                                <div className="section-heading">
                                    <span>
                                        EMERGENCY REQUESTS
                                    </span>

                                    <h2>
                                        Incoming requests
                                    </h2>
                                </div>

                                {requests.length === 0 ? (
                                    <div className="empty-state">
                                        <div>📭</div>

                                        <h3>
                                            No incoming requests
                                        </h3>
                                    </div>
                                ) : (
                                    <div className="request-list">
                                        {requests.map(
                                            (request) => (
                                                <article
                                                    className="request-item"
                                                    key={
                                                        request.id
                                                    }
                                                >
                                                    <div>
                                                        <span className="category-badge">
                                                            {
                                                                request.priority
                                                            }
                                                        </span>

                                                        <h3>
                                                            {
                                                                request
                                                                    .resource
                                                                    .name
                                                            }
                                                        </h3>

                                                        <p>
                                                            Requested by:{" "}
                                                            {
                                                                request.user
                                                                    .name
                                                            }
                                                        </p>

                                                        <p>
                                                            Quantity:{" "}
                                                            {
                                                                request.quantity
                                                            }
                                                        </p>

                                                        <p>
                                                            Message:{" "}
                                                            {request.message ||
                                                                "No message"}
                                                        </p>
                                                    </div>

                                                    <div className="request-actions">
                                                        <span
                                                            className={`status status-${request.status.toLowerCase()}`}
                                                        >
                                                            {
                                                                request.status
                                                            }
                                                        </span>

                                                        {request.status ===
                                                            "PENDING" && (
                                                            <>
                                                                <button
                                                                    className="btn btn-primary"
                                                                    onClick={() =>
                                                                        updateRequest(
                                                                            request.id,
                                                                            "ACCEPTED"
                                                                        )
                                                                    }
                                                                >
                                                                    Accept
                                                                </button>

                                                                <button
                                                                    className="btn btn-danger"
                                                                    onClick={() =>
                                                                        updateRequest(
                                                                            request.id,
                                                                            "REJECTED"
                                                                        )
                                                                    }
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </>
            )}
        </main>
    );
};

export default ProviderDashboard;