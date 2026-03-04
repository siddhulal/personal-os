FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY pom.xml .
# Use Maven wrapper or install Maven directly
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
