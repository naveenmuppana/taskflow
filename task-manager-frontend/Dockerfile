# Lightweight Nginx server for static frontend
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy frontend static files
COPY . /usr/share/nginx/html

# Expose port 80 inside container
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
