FROM node:24-alpine AS frontend-build

WORKDIR /app/frontend

COPY backend/frontend/package*.json ./
RUN npm ci

COPY backend/frontend/ ./
RUN npm run build


FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /app/backend

COPY backend/pom.xml ./
COPY backend/src ./src

RUN rm -rf ./src/main/resources/static

COPY --from=frontend-build /app/src/main/resources/static ./src/main/resources/static

RUN mvn clean package -DskipTests


FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=backend-build /app/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]