import json
import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__, static_folder="static", template_folder="templates")

# Arquivo de armazenamento de notas
NOTAS_FILE = "notas.json"

CATEGORIAS_PADRAO = [
    "Sem categoria",
    "Trabalho",
    "Pessoal",
    "Estudos",
    "Outros"
]

def proximo_id(notas):
    return max((nota.get("id", 0) for nota in notas), default=0) + 1

def carregar_notas():
    """Carrega as notas do arquivo JSON."""
    if os.path.exists(NOTAS_FILE):
        with open(NOTAS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def salvar_notas(notas):
    """Salva as notas no arquivo JSON."""
    with open(NOTAS_FILE, "w", encoding="utf-8") as f:
        json.dump(notas, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

# Rota para salvar nota
@app.route("/salvar_nota", methods=["POST"])
def salvar_nota():
    titulo = request.json.get("titulo", "").strip() or "Sem título"
    categoria = request.json.get("categoria", "").strip() or "Sem categoria"
    conteudo = request.json.get("conteudo", request.json.get("nota", "")).strip()

    if not conteudo:
        return jsonify({"status": "erro", "mensagem": "Conteúdo da nota está vazio"}), 400


    notas = carregar_notas()
    nova_nota = {
        "id": proximo_id(notas),
        "titulo": titulo,
        "categoria": categoria,
        "conteudo": conteudo,
        "data_criacao": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "última_edicao": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }
    notas.append(nova_nota)
    salvar_notas(notas)

    return jsonify({"status": "ok", "nota": nova_nota})

# Rota para listar todas as notas
@app.route("/listar_notas", methods=["GET"])
def listar_notas():
    notas = carregar_notas()
    return jsonify(notas)

# Rota para editar nota
@app.route("/editar_nota/<int:nota_id>", methods=["PUT"])
def editar_nota(nota_id):
    titulo = request.json.get("titulo", "").strip() or "Sem título"
    categoria = request.json.get("categoria", "").strip() or "Sem categoria"
    conteudo = request.json.get("conteudo", request.json.get("nota", "")).strip()

    if not conteudo:
        return jsonify({"status": "erro", "mensagem": "Conteúdo da nota está vazio"}), 400

    if categoria not in CATEGORIAS_PADRAO:
        categoria = "Outros"

    notas = carregar_notas()
    for nota in notas:
        if nota["id"] == nota_id:
            nota["titulo"] = titulo
            nota["categoria"] = categoria
            nota["conteudo"] = conteudo
            nota["última_edicao"] = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            salvar_notas(notas)
            return jsonify({"status": "ok", "nota": nota})

    return jsonify({"status": "erro", "mensagem": "Nota não encontrada"}), 404

# Rota para deletar nota
@app.route("/deletar_nota/<int:nota_id>", methods=["DELETE"])
def deletar_nota(nota_id):
    notas = carregar_notas()
    notas = [nota for nota in notas if nota["id"] != nota_id]
    salvar_notas(notas)
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True, port=8080)