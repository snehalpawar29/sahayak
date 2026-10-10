import { useCallback, useEffect, useState } from "react";

import ResourceCard from "../components/ResourceCard";
import Loading from "../components/Loading";
import api from "../services/api";

const categories = [
    ["", "All Resources"],
    ["BLOOD", "Blood"],
    ["HOSPITAL_BED", "Hospital Beds"],
    ["MEDICINE", "Medicine"],
    ["AMBULANCE", "Ambulance"],
    ["SHELTER", "Shelter"],
    ["FOOD", "Food"],
    ["WATER", "Water"]
];

const Resources = () => {
    const [resources, setResources] =
        useState([]);

    const [category, setCategory] =
        useState("");

    const [city, setCity] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const fetchResources = useCallback(async () => {
        setLoading(true);
        setError("");

      try {
        const params =
            new URLSearchParams();

        if (category) {
          params.set(
              "category",
              category
          );
      }

        if (city.trim()) {
          params.set(
              "city",
              city.trim()
          );
      }

        params.set(
            "available",
            "true"
        );

        const query =
            params.toString();

        const response =
            await api.getResources(
                query
                    ? `?${query}`
                    : ""
            );

        setResources(
            response.data?.resources ||
            []
        );
    } catch (error) {
          setError(
              error.message ||
              "Failed to fetch resources."
          );
          setResources([]);
      } finally {
          setLoading(false);
      }
    }, [category, city]);

    useEffect(() => {
        let cancelled = false;

        queueMicrotask(() => {
            if (!cancelled) {
                fetchResources();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [fetchResources]);

    const handleSubmit = (
        event
    ) => {
        event.preventDefault();
        fetchResources();
    };

    return (
        <main className="container page">
            <div className="page-header">
                <div>
                    <span className="eyebrow">
                        EMERGENCY RESOURCES
                    </span>

                  <h1>
                      Find help near you
                  </h1>

                  <p>
                      Search verified emergency resources with their latest reported availability.
                  </p>
              </div>
          </div>

          <form
              className="search-panel"
              onSubmit={handleSubmit}
          >
              <input
                  value={city}
                  onChange={(event) =>
                      setCity(
                          event.target.value
                      )
                  }
                  placeholder="Search city..."
              />

              <select
                  value={category}
                  onChange={(event) =>
                      setCategory(
                          event.target.value
                      )
                  }
              >
                  {categories.map(
                      ([value, label]) => (
                          <option
                              key={value}
                              value={value}
                          >
                              {label}
                          </option>
              )
          )}
              </select>

              <button
                  type="submit"
                  className="btn btn-primary"
              >
                  Search
              </button>
          </form>

          {error && (
              <div className="alert error">
                  {error}
              </div>
          )}

          {loading ? (
              <Loading text="Finding available resources..." />
          ) : resources.length ===
              0 ? (
              <div className="empty-state">
                  <div>🔎</div>

                      <h2>
                          No resources found
                      </h2>

                      <p>
                          Try another city or resource category.
                      </p>
                  </div>
              ) : (
                  <>
                      <div className="results-header">
                          <strong>
                              {resources.length} resource
                                  {resources.length !==
                                      1
                                      ? "s"
                                      : ""}{" "}
                                  found
                              </strong>
                          </div>

                          <div className="resource-grid">
                              {resources.map(
                                  (resource) => (
                                      <ResourceCard
                                          key={resource.id}
                        resource={
                            resource
                        }
                    />
                )
            )}
                  </div>
              </>
          )}
      </main>
  );
};

export default Resources;