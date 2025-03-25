## About

This is the first deliverable of the Nymja.ai project, which aims to create an app that concentrates open-source LLMs under a privacy-focused architecture.

Thus, this MVP runs on the Llama 3.2 1B model, using Python Django for the backend, Next.js for the frontend, and PostgreSQL as the database. You can run it locally by following the instructions below, being orchestrated by Docker.

To find out more about the project, visit the [Nym forum](https://forum.nym.com/t/report-on-nymja-ai-alpha-version-release/1191).

## Installation and Running Instructions

This project is containerized using Docker, simplifying the setup process. Please ensure you have Docker installed on your system before proceeding.

### Prerequisites

* **Docker:** You must have Docker and Docker Compose installed.
    * **Mac:** Download and install Docker Desktop for Mac from [Docker's official website](https://www.docker.com/products/docker-desktop).
    * **Linux:** Follow the instructions for your distribution on the [Docker documentation](https://docs.docker.com/engine/install/).
* **PostgreSQL (Optional but recommended):** While the docker image contains a postgres database, if you intend to run the database outside of docker, or if you will be developing and require postgresql tools, then you should install it.
    * **Mac:** You can use Homebrew: `brew install postgresql`
    * **Linux:** Use your distribution's package manager (e.g., `sudo apt-get install postgresql` on Ubuntu/Debian, `sudo yum install postgresql` on Fedora/CentOS).

### Installation and Running

1.  **Clone the Repository:**

    ```bash
    git clone [https://github.com/psydenst/Nymja_AI_MVP.git](https://github.com/psydenst/Nymja_AI_MVP.git)
    cd Nymja_AI_MVP
    ```

2.  **Ensure Port 5432 is Available:**

    Before running Docker Compose, ensure that nothing else is running on port 5432, which is used by the PostgreSQL database.

    * **Check for Existing Processes:**

        ```bash
        sudo lsof -i :5432
        ```

    * **Kill Existing Processes (if any):**

        If the above command shows any processes using port 5432, kill them using their PID (Process ID):

        ```bash
        sudo kill -9 <PID>
        ```

        Replace `<PID>` with the actual process ID.

3.  **Ensure Port 3000 is Available:**

    Before running Docker Compose, ensure that nothing else is running on port 3000, which is used by the web application.

    * **Check for Existing Processes:**

        ```bash
        sudo lsof -i :3000
        ```

    * **Kill Existing Processes (if any):**

        If the above command shows any processes using port 3000, kill them using their PID (Process ID):

        ```bash
        sudo kill -9 <PID>
        ```

        Replace `<PID>` with the actual process ID.

4.  **Build and Run the Docker Containers using Makefile:**

    * **Initial Build and Run:**

        ```bash
        make
        ```

        This command will build the Docker images and start the containers in detached mode.

    * **Rebuild and Run:**

        ```bash
        make re
        ```

        This command will rebuild the Docker images and restart the containers in detached mode.

    * **Stop and Remove Containers:**

        ```bash
        make down
        ```

        This command will stop and remove the running containers.

    * **Clean Docker System:**

        ```bash
        make clean
        ```

        This command will stop and remove the containers and prune unused Docker resources.

    * **Fully Clean Docker System:**

        ```bash
        make fclean
        ```

        This command will stop all running Docker containers and perform a full clean of Docker resources, including images, volumes, and networks. **It will remove all your volumes**

5.  **Access the Application:**

    Once the containers are running, you can access the Nymja.AI web application by opening your web browser and navigating to `http://localhost:3000`.

### Mac Specific Instructions

1.  **Install Docker Desktop:**

    * Download the Docker Desktop for Mac installer from [Docker's official website](https://www.docker.com/products/docker-desktop).
    * Open the `.dmg` file and drag the Docker icon to your Applications folder.
    * Launch Docker Desktop from your Applications folder.
    * Follow the on-screen instructions to complete the installation.

2.  **Verify Docker Installation:**

    Open a terminal and run the following commands to verify that Docker and Docker Compose are installed correctly:

    ```bash
    docker --version
    docker-compose --version
    ```

3.  **Docker RAM Performance:**

    For optimal performance, especially when running resource-intensive LLMs, it's crucial to allocate sufficient RAM to Docker Desktop. You can adjust the RAM allocation in Docker Desktop's settings.

    * Open Docker Desktop.
    * Go to **Preferences** (or **Settings**).
    * Navigate to the **Resources** tab.
    * Adjust the **Memory** slider to increase the allocated RAM. A minimum of 8GB is recommended, but 16GB or more may be necessary for larger models. I'm running it successfully on a Macbook Pro M1, reserving 6GB of RAM for Docker, however.
    * [Insert Printscreen of Docker Desktop RAM settings here]
   <img width="1665" alt="image" src="https://github.com/user-attachments/assets/fa76ef53-f9a6-4e91-b120-9d78a7d41bab" />


### Linux Specific Instructions

1.  **Install Docker:**

    Follow the installation instructions for your specific Linux distribution from the official Docker documentation: [Install Docker Engine on Linux](https://docs.docker.com/engine/install/).

    For example, on Ubuntu:

    ```bash
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
    ```

2.  **Add User to Docker Group (Optional):**

    To run Docker commands without `sudo`, add your user to the `docker` group:

    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    ```

3.  **Verify Docker Installation:**

    Open a terminal and run the following commands to verify that Docker and Docker Compose are installed correctly:

    ```bash
    docker --version
    docker compose version
    ```

4.  **Docker RAM Performance:**

    On Linux, Docker utilizes the system's available RAM. However, you can ensure Docker has sufficient memory by adjusting the cgroup settings.

    * **Check Current Memory Limits (Optional):**

        ```bash
        cat /sys/fs/cgroup/memory/docker/<container_id>/memory.limit_in_bytes
        ```

        Replace `<container_id>` with the ID of your Docker container.

    * **Adjust Docker Memory Limits (Using `docker run` or `docker-compose`):**

        When running Docker containers, use the `--memory` or `-m` flag to set memory limits. For example:

        ```bash
        docker run -m 8g <image_name>
        ```

        Or, in your `docker-compose.yml` file:

        ```yaml
        services:
          your_service:
            image: <image_name>
            mem_limit: 8g
        ```

        Replace `<image_name>` with your Docker image and adjust the memory limit as needed (e.g., `8g` for 8 gigabytes).
      
### Troubleshooting

* If you encounter issues with the build process, ensure that you have sufficient disk space (+/- 7gb) and that your Docker environment is properly configured.
* If the application is not accessible at `http://localhost:3000`, check the Docker logs for any error messages:

    ```bash
    docker-compose logs [container name] (backend, frontend, pgadmin or ollama)
    ```

* If you have issues with docker compose versioning between mac and linux, please check that you have docker compose V2 installed.

### License

This project is licensed under the [LICENSE](LICENSE) file.
