import { Link } from "react-router-dom";

const ResourceCard = ({ resource }) => {
    return (
        <article className="resource-card">
            <div className="resource-card-header">
                <span className="category-badge">
                    {resource.category.replaceAll("_", " ")}
                </span>

                <span
                    className={
                        resource.available
                            ? "status available"
                            : "status unavailable"
                    }
                >
                    {resource.available
                        ? "Available"
                        : "Unavailable"}
                </span>
            </div>

            <h3>{resource.name}</h3>

            <p className="provider-name">
                {resource.provider?.organization}
            </p>

            <p>
                📍 {resource.city}
            </p>

            <p>
                Quantity:{" "}
                <strong>{resource.quantity}</strong>
            </p>

            <p className="updated">
                Updated:{" "}
                {new Date(
                    resource.updatedAt
                ).toLocaleString()}
            </p>

            <Link
                to={`/resources/${resource.id}`}
                className="btn btn-primary btn-full"
            >
                View Details
            </Link>
        </article>
    );
};

export default ResourceCard;