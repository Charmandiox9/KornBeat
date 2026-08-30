FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/proxy_headers.conf /etc/nginx/proxy_headers.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
