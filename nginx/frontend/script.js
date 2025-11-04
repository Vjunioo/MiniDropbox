document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("upload-form");
    const fileInput = document.getElementById("file-input");
    const uploadStatus = document.getElementById("upload-status");
    const listFilesButton = document.getElementById("list-files-button");
    const fileList = document.getElementById("file-list");

    const dropZone = document.getElementById("drop-zone");

    const lightbox = document.getElementById("myLightbox");
    const lightboxImg = document.getElementById("img01");
    const lightboxVid = document.getElementById("vid01");
    const captionText = document.getElementById("caption");
    const closeLightbox = document.getElementsByClassName("close-lightbox")[0];

    const startTestButton = document.getElementById("start-test-button");
    const stopTestButton = document.getElementById("stop-test-button");
    const statsTableBody = document.getElementById("cluster-stats-body");
    const loadTestStatus = document.getElementById("load-test-status");

    const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg'];

    let testInterval = null;
    let serverStats = {};

    function getPublicUrl(internalUrl) {
        try {
            const url = new URL(internalUrl);
            return `/storage${url.pathname}${url.search}`;
        } catch (e) {
            console.error("URL interna inválida:", internalUrl);
            return "#";
        }
    }

    function closeLightboxModal() {
        lightbox.style.display = "none";
        lightboxVid.pause();
        lightboxVid.src = "";
        lightboxImg.src = "";
    }
    if (closeLightbox) { closeLightbox.onclick = closeLightboxModal; }
    window.onclick = function(event) {
        if (event.target == lightbox) {
            closeLightboxModal();
        }
    }
    function openMediaLightbox(mediaUrl, mediaCaption, extension) {
        lightboxImg.style.display = "none";
        lightboxVid.style.display = "none";
        if (IMAGE_EXTENSIONS.includes(extension)) {
            lightboxImg.src = mediaUrl;
            lightboxImg.style.display = "block";
        } else if (VIDEO_EXTENSIONS.includes(extension)) {
            lightboxVid.src = mediaUrl;
            lightboxVid.style.display = "block";
        }
        captionText.innerHTML = mediaCaption;
        lightbox.style.display = "block";
    }

    async function uploadFile(file) {
        if (!file) {
            uploadStatus.className = "status-message error";
            uploadStatus.textContent = "Nenhum arquivo selecionado.";
            return;
        }
        uploadStatus.className = "status-message";
        uploadStatus.textContent = `Enviando "${file.name}"...`;
        const formData = new FormData();
        formData.append("file", file);
        try {
            const response = await fetch("/api/upload/", {
                method: "POST",
                body: formData,
            });
            if (response.ok) {
                uploadStatus.className = "status-message success";
                uploadStatus.textContent = `Upload de '${file.name}' feito com sucesso!`;
                fileInput.value = "";
                loadFiles();
            } else {
                const errorData = await response.json();
                uploadStatus.className = "status-message error";
                uploadStatus.textContent = `Erro no upload: ${errorData.detail || response.statusText}`;
            }
        } catch (error) {
            uploadStatus.className = "status-message error";
            uploadStatus.textContent = `Erro de rede ou servidor: ${error.message}`;
        }
    }

    if (uploadForm) {
        uploadForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const file = fileInput.files[0];
            uploadFile(file);
        });
    }

    if (dropZone) {
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault(); 
            dropZone.classList.add("drag-over");
        });
        dropZone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            dropZone.classList.remove("drag-over");
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault(); 
            dropZone.classList.remove("drag-over");
            const file = e.dataTransfer.files[0];
            if (file) {
                fileInput.files = e.dataTransfer.files; 
                uploadFile(file); 
            }
        });
    }

    if (listFilesButton) {
        listFilesButton.addEventListener("click", loadFiles);
    }
    async function loadFiles() {
        fileList.innerHTML = "<li class='placeholder'>Carregando arquivos...</li>";
        try {
            const response = await fetch("/api/files/");
            const files = await response.json();
            fileList.innerHTML = "";
            if (files.length === 0) {
                fileList.innerHTML = "<li class='placeholder'>Nenhum arquivo encontrado.</li>";
                return;
            }
            for (const file of files) {
                const li = document.createElement("li");
                const fileExtension = file.filename.split('.').pop().toLowerCase();
                const isImage = IMAGE_EXTENSIONS.includes(fileExtension);
                const isVideo = VIDEO_EXTENSIONS.includes(fileExtension);
                
                if (isImage) {
                    const icon = document.createElement("span");
                    icon.textContent = "🖼️";
                    icon.className = "file-icon";
                    li.appendChild(icon);
                } else if (isVideo) {
                    const icon = document.createElement("span");
                    icon.textContent = "🎥";
                    icon.className = "file-icon";
                    li.appendChild(icon);
                } else {
                    const icon = document.createElement("span");
                    icon.textContent = "📄";
                    icon.className = "file-icon";
                    li.appendChild(icon);
                }

                const fileNameLink = document.createElement("a");
                fileNameLink.href = "#";
                fileNameLink.className = "file-link";
                fileNameLink.textContent = file.filename;
                fileNameLink.onclick = (e) => {
                    e.preventDefault();
                    getDownloadLink(file.id);
                };
                li.appendChild(fileNameLink);

                const actionsDiv = document.createElement("div");
                actionsDiv.className = "file-actions";
                
                const downloadButton = document.createElement("button");
                downloadButton.textContent = "Baixar";
                downloadButton.onclick = () => getDownloadLink(file.id);
                actionsDiv.appendChild(downloadButton);

                if (isImage || isVideo) {
                     const viewButton = document.createElement("button");
                     viewButton.textContent = "Ver";
                     viewButton.className = "view-button";
                     viewButton.onclick = async () => {
                        try {
                            const downloadResponse = await fetch(`/api/download/${file.id}`);
                            const downloadData = await downloadResponse.json();
                            if (downloadData.download_url) {
                                const publicUrl = getPublicUrl(downloadData.download_url);
                                openMediaLightbox(publicUrl, file.filename, fileExtension);
                            } else {
                                console.error("Não foi possível obter URL para visualizar.");
                            }
                        } catch (viewError) {
                             console.error("Erro ao obter URL para visualizar:", viewError);
                        }
                     };
                     actionsDiv.appendChild(viewButton);
                }
                li.appendChild(actionsDiv);
                fileList.appendChild(li);
            }
        } catch (error) {
            fileList.innerHTML = `<li class='placeholder error'>Erro ao carregar arquivos: ${error.message}</li>`;
        }
    }

    async function getDownloadLink(fileId) {
        try {
            const response = await fetch(`/api/download/${fileId}`);
            const data = await response.json();
            if (data.download_url) {
                const publicUrl = getPublicUrl(data.download_url);
                window.open(publicUrl, "_blank");
            } else {
                console.error("Erro ao obter link de download:", data.detail);
            }
        } catch (error) {
            console.error("Erro de rede ao obter link de download:", error);
        }
    }

    
    if (startTestButton) {
        startTestButton.addEventListener("click", () => {
            startTestButton.disabled = true;
            stopTestButton.disabled = false;
            loadTestStatus.style.display = "none";
            serverStats = {};
            statsTableBody.innerHTML = "<tr><td colspan='3' style='padding: 12px; text-align: center;'>Iniciando teste...</td></tr>";
            
            testInterval = setInterval(runTestBurst, 1000); 
        });
    }

    if (stopTestButton) {
        stopTestButton.addEventListener("click", () => {
            startTestButton.disabled = false;
            stopTestButton.disabled = true;
            if (testInterval) {
                clearInterval(testInterval);
            }
            loadTestStatus.textContent = "Teste parado.";
            loadTestStatus.className = "status-message";
            loadTestStatus.style.display = "block";
        });
    }

    async function runTestBurst() {
        const numRequests = 10; 
        const requests = [];

        for (let i = 0; i < numRequests; i++) {
            requests.push(measureRequestTime(`/api/?cache_bust=${Math.random()}`));
        }

        try {
            await Promise.all(requests);
            updateStatsTable();
        } catch (error) {
            console.error("Erro no burst de teste:", error);
        }
    }

    async function measureRequestTime(url) {
        const startTime = performance.now(); 
        try {
            const response = await fetch(url);
            if (!response.ok) {
                updateStats("ERRO_SERVIDOR", 0);
                return;
            }
            const data = await response.json();
            const endTime = performance.now(); 
            const duration = endTime - startTime; 
            updateStats(data.hostname, duration);
        } catch (error) {
            console.error("Falha no request:", error.message);
            updateStats("FALHA_REDE", 0);
        }
    }

    function updateStats(hostname, duration) {
        const host = hostname || 'hostname_desconhecido';
        if (!serverStats[host]) {
            serverStats[host] = {
                count: 0,
                totalTime: 0
            };
        }
        serverStats[host].count++;
        serverStats[host].totalTime += duration;
    }

    function updateStatsTable() {
        statsTableBody.innerHTML = "";
        const sortedHosts = Object.keys(serverStats).sort();

        for (const host of sortedHosts) {
            const stats = serverStats[host];
            const avgTime = (stats.totalTime / stats.count).toFixed(2);

            const newRow = document.createElement("tr");
            newRow.innerHTML = `
                <td style="padding: 12px; border: 1px solid #ddd;">${host}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${stats.count}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${avgTime} ms</td>
            `;

            if (host.includes("ERRO") || host.includes("FALHA")) {
                newRow.style.backgroundColor = "#f8d7da";
                newRow.style.color = "#721c24";
            }
            
            statsTableBody.appendChild(newRow);
        }
    }
    
    // --- CARGA INICIAL ---
    loadFiles();
});