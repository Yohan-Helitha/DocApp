FROM postgres:15.4-alpine

# Default DB name/user; can still be overridden by env vars at runtime
ENV POSTGRES_DB=admindb
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

# Run admin schema init on first container start
COPY init.sql /docker-entrypoint-initdb.d/01-admin-init.sql
