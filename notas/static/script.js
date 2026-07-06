// Variáveis de estado da interface
let notaEmEdicao = null;
let notasGlobais = [];

// Carrega as notas ao abrir a página
document.addEventListener("DOMContentLoaded", () => {
    carregarHistoricoNotas();
    document.getElementById("filtro-texto").addEventListener("input", aplicarFiltros);
    document.getElementById("filtro-categoria").addEventListener("input", aplicarFiltros);
    document.getElementById("filtro-data").addEventListener("change", aplicarFiltros);
    document.getElementById("limpar-filtro").addEventListener("click", limparFiltros);

    const textoNota = document.getElementById("texto-nota");
    const textoEditar = document.getElementById("texto-editar");

    textoNota.addEventListener("paste", function (event) {
        processarColarRichText(event, textoNota);
    });

    textoEditar.addEventListener("paste", function (event) {
        processarColarRichText(event, textoEditar);
    });
});

// Gerar senha no navegador
document.getElementById("gerar-senha").addEventListener("click", function () {
    const tamanho = parseInt(document.getElementById("tamanho-senha").value, 10);
    if (tamanho < 4) {
        alert("Tamanho mínimo: 4 caracteres.");
        return;
    }

    let chars = "";
    if (document.getElementById("minusculas").checked) {
        chars += "abcdefghijklmnopqrstuvwxyz";
    }
    if (document.getElementById("maiusculas").checked) {
        chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }
    if (document.getElementById("numeros").checked) {
        chars += "0123456789";
    }
    if (document.getElementById("simbolos").checked) {
        chars += "!@#$%&*()-_=+[]{}|;:,.<>?/";
    }

    if (!chars) {
        alert("Selecione pelo menos um tipo de caractere.");
        return;
    }

    let senha = "";
    for (let i = 0; i < tamanho; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    document.getElementById("resultado-senha").textContent = senha;
});

// Copiar senha para a área de transferência
document.getElementById("copiar-senha").addEventListener("click", function () {
    const senha = document.getElementById("resultado-senha").textContent.trim();
    if (senha === "") {
        alert("Nenhuma senha gerada ainda.");
        return;
    }
    navigator.clipboard.writeText(senha)
        .then(() => alert("Senha copiada!"))
        .catch(() => alert("Falha ao copiar."));
});

function processarColarRichText(event, editor) {
    const clipboard = event.clipboardData;
    if (!clipboard) {
        return;
    }

    const items = Array.from(clipboard.items || []);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    const text = clipboard.getData("text/plain");

    if (imageItems.length === 0) {
        if (text) {
            event.preventDefault();
            insertTextAtCaret(text);
        }
        return;
    }

    event.preventDefault();
    if (text) {
        insertTextAtCaret(text);
    }

    imageItems.forEach(item => {
        const file = item.getAsFile();
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            insertImageAtCaret(reader.result);
        };
        reader.onerror = () => {
            alert("Falha ao ler a imagem colada.");
        };
        reader.readAsDataURL(file);
    });
}

function insertTextAtCaret(text) {
    document.execCommand("insertText", false, text);
}

function insertImageAtCaret(src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Imagem colada";
    img.className = "nota-imagem";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        const editor = document.activeElement;
        if (editor && editor.isContentEditable) {
            editor.appendChild(img);
        }
        return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function sanitizeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const safeRoot = document.createElement("div");
    const allowedTags = new Set(["DIV", "P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "IMG", "SPAN", "PRE"]);
    const allowedAttributes = {
        IMG: ["src", "alt", "title"]
    };

    function sanitizeNode(node, target) {
        if (node.nodeType === Node.TEXT_NODE) {
            target.appendChild(document.createTextNode(node.textContent));
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        if (!allowedTags.has(node.tagName)) {
            node.childNodes.forEach(child => sanitizeNode(child, target));
            return;
        }
        const sanitized = document.createElement(node.tagName.toLowerCase());
        const attrs = allowedAttributes[node.tagName] || [];
        attrs.forEach(attr => {
            if (node.hasAttribute(attr)) {
                const value = node.getAttribute(attr);
                if (attr === "src" && node.tagName === "IMG" && /^data:image\//.test(value)) {
                    sanitized.setAttribute(attr, value);
                } else if (attr !== "src") {
                    sanitized.setAttribute(attr, value);
                }
            }
        });
        node.childNodes.forEach(child => sanitizeNode(child, sanitized));
        target.appendChild(sanitized);
    }

    doc.body.childNodes.forEach(node => sanitizeNode(node, safeRoot));
    return safeRoot.innerHTML;
}

function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
}

// Salvar nota (via fetch para o backend)
document.getElementById("salvar-nota").addEventListener("click", function () {
    const editorNota = document.getElementById("texto-nota");
    const titulo = document.getElementById("titulo-nota").value.trim();
    const categoria = document.getElementById("categoria-nota").value;
    const conteudo = sanitizeHtml(editorNota.innerHTML);
    const conteudoTexto = editorNota.textContent.trim();

    if (conteudoTexto === "" && !editorNota.querySelector("img")) {
        alert("A nota está vazia.");
        return;
    }

    fetch("/salvar_nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            conteudo: conteudo,
            titulo: titulo,
            categoria: categoria
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            document.getElementById("texto-nota").innerHTML = "";
            document.getElementById("titulo-nota").value = "";
            document.getElementById("categoria-nota").value = "Sem categoria";
            alert("Nota salva com sucesso!");
            carregarHistoricoNotas();
        } else {
            alert("Erro ao salvar nota: " + data.mensagem);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Erro ao salvar nota.");
    });
});

// Carregar e exibir histórico de notas
function carregarHistoricoNotas() {
    fetch("/listar_notas")
        .then(response => response.json())
        .then(notas => {
            notasGlobais = notas;
            aplicarFiltros();
        })
        .catch(err => {
            console.error(err);
            alert("Erro ao carregar histórico de notas.");
        });
}

function aplicarFiltros() {
    const texto = document.getElementById("filtro-texto").value.trim().toLowerCase();
    const categoria = document.getElementById("filtro-categoria").value;
    const dataFiltro = document.getElementById("filtro-data").value;
    let notasFiltradas = [...notasGlobais];

    if (texto) {
        notasFiltradas = notasFiltradas.filter(nota => {
            const titulo = (nota.titulo || "").toLowerCase();
            const conteudo = stripHtml(nota.conteudo || "").toLowerCase();
            return titulo.includes(texto) || conteudo.includes(texto);
        });
    }

    if (categoria) {
        notasFiltradas = notasFiltradas.filter(nota => {
            const categoriaNota = (nota.categoria || "").toLowerCase();
            return categoriaNota.includes(categoria.toLowerCase());
        });
    }

    if (dataFiltro) {
        notasFiltradas = notasFiltradas.filter(nota => {
            if (!nota.data_criacao) return false;
            const [dia, mes, ano] = nota.data_criacao.split(" ")[0].split("/");
            const isoData = `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
            return isoData === dataFiltro;
        });
    }

    renderizarNotas(notasFiltradas);
}

function limparFiltros() {
    document.getElementById("filtro-texto").value = "";
    document.getElementById("filtro-categoria").value = "";
    document.getElementById("filtro-data").value = "";
    aplicarFiltros();
}

function renderizarNotas(notas) {
    const historico = document.getElementById("historico-notas");
    if (!notas || notas.length === 0) {
        historico.innerHTML = "<p style=\"color: #999;\">Nenhuma nota corresponde aos filtros.</p>";
        return;
    }

    historico.innerHTML = "";
    const notasOrdenadas = [...notas].sort((a, b) => b.id - a.id);

    notasOrdenadas.forEach(nota => {
        const notaDiv = document.createElement("div");
        notaDiv.className = "nota-item";
        const legacyImage = nota.imagem_base64 ? `<div class="nota-imagem-container"><img src="${nota.imagem_base64}" class="nota-imagem" alt="Imagem da nota"></div>` : "";
        const conteudoHtml = nota.conteudo ? sanitizeHtml(nota.conteudo) : "";
        notaDiv.innerHTML = `
            <div class="nota-cabecalho">
                <h4>${escapeHtml(nota.titulo || "Sem título")}</h4>
                <span class="nota-categoria">${escapeHtml(nota.categoria || "Sem categoria")}</span>
            </div>
            <div class="nota-data">
                Criada em: ${nota.data_criacao || "-"}
                ${nota.data_edicao && nota.data_edicao !== nota.data_criacao ? `| Editada em: ${nota.data_edicao}` : ''}
            </div>
            ${legacyImage}
            <div class="nota-conteudo">${conteudoHtml}</div>
            <div class="nota-acoes">
                <button class="btn-editar" onclick="abrirEdicao(${nota.id})">✏️ Editar</button>
                <button class="btn-deletar" onclick="deletarNota(${nota.id})">🗑️ Deletar</button>
            </div>
        `;
        historico.appendChild(notaDiv);
    });
}

// Abrir modal de edição
function abrirEdicao(notaId) {
    const nota = notasGlobais.find(n => n.id === notaId);
    if (nota) {
        notaEmEdicao = notaId;
        document.getElementById("titulo-editar").value = nota.titulo || "";
        document.getElementById("categoria-editar").value = nota.categoria || "Sem categoria";
        document.getElementById("texto-editar").innerHTML = nota.conteudo || "";
        document.getElementById("modal-editar").style.display = "block";
    }
}

// Fechar modal
document.querySelector(".close").addEventListener("click", function () {
    document.getElementById("modal-editar").style.display = "none";
});

window.addEventListener("click", function (event) {
    const modal = document.getElementById("modal-editar");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// Confirmar edição
document.getElementById("confirmar-edicao").addEventListener("click", function () {
    const titulo = document.getElementById("titulo-editar").value.trim();
    const categoria = document.getElementById("categoria-editar").value;
    const editorEditar = document.getElementById("texto-editar");
    const conteudo = sanitizeHtml(editorEditar.innerHTML);
    const conteudoTexto = editorEditar.textContent.trim();

    if (conteudoTexto === "" && !editorEditar.querySelector("img")) {
        alert("A nota está vazia.");
        return;
    }

    const payload = {
        titulo: titulo,
        categoria: categoria,
        conteudo: conteudo
    };

    fetch(`/editar_nota/${notaEmEdicao}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "ok") {
            document.getElementById("modal-editar").style.display = "none";
            carregarHistoricoNotas();
            alert("Nota editada com sucesso!");
        } else {
            alert("Erro ao editar nota: " + data.mensagem);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Erro ao editar nota.");
    });
});

// Deletar nota
function deletarNota(notaId) {
    if (confirm("Tem certeza que deseja deletar esta nota?")) {
        fetch(`/deletar_nota/${notaId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "ok") {
                carregarHistoricoNotas();
                alert("Nota deletada com sucesso!");
            }
        })
        .catch(err => {
            console.error(err);
            alert("Erro ao deletar nota.");
        });
    }
}

// Escapar caracteres HTML para evitar XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}