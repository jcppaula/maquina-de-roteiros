#!/usr/bin/env python3
"""
Fontes × texto — roteirista-historia-militar.

Cruza a ficha de pesquisa (tabelas "Fontes" e "Afirmações centrais") com os ids citados no roteiro.
Confere o REGISTRO da pesquisa, não a verdade: não sabe se a página diz o que a ficha afirma. Por isso
a conferência a frio continua obrigatória.

FALHA:
  - id citado no roteiro que não existe na tabela de fontes
  - fonte citada com status diferente de verified/partial
  - fonte verified/partial sem URL, trecho, data de acesso, grupo ou "o que foi aberto"
  - fonte partial sem dizer o que foi aberto
  - URL de tipo proibido marcada como verified/partial (Wikipedia, YouTube, fórum, rede social, blog)
  - afirmação central sem fontes verified/partial de dois grupos independentes
  - tabela "Fontes" ou "Afirmações centrais" ausente
  - roteiro sem nenhum id de fonte
AVISO:
  - acesso com mais de --dias dias (padrão 30)
  - fonte verified nunca citada no roteiro
  - todas as fontes citadas no mesmo grupo
  - bloco com pista de mapa ou número e nenhum id

Uso:
  python3 checar_fontes.py 01-ficha-de-pesquisa.md 02-roteiro.md [--hoje AAAA-MM-DD] [--dias 30]
"""
import argparse
import datetime as dt
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ficha_lib import parse_roteiro

PROIBIDAS = re.compile(r"(wikipedia\.org|youtube\.com|youtu\.be|reddit\.com|quora\.com|facebook\.com|"
                       r"twitter\.com|x\.com/|instagram\.com|tiktok\.com|medium\.com|blogspot\.|wordpress\.com|"
                       r"fandom\.com|forum|ancestry\.com/boards)", re.I)
OK_STATUS = {"verified", "partial"}


def tabela(texto, titulo):
    """Linhas (dicionários) da primeira tabela depois do cabeçalho '## titulo'."""
    m = re.search(r"^##\s+" + re.escape(titulo) + r".*$", texto, re.M | re.I)
    if not m:
        return None
    linhas = texto[m.end():].splitlines()
    header, out = None, []
    for ln in linhas:
        if ln.startswith("## "):
            break
        if not ln.startswith("|"):
            if header is not None and out:
                break
            continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if header is None:
            header = [c.lower() for c in cells]
            continue
        if set("".join(cells)) <= set("-: "):
            continue
        out.append(dict(zip(header, cells)))
    return out


def col(row, *nomes):
    for k, v in row.items():
        for n in nomes:
            if n in k:
                return v
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ficha")
    ap.add_argument("roteiro")
    ap.add_argument("--hoje", default=dt.date.today().isoformat())
    ap.add_argument("--dias", type=int, default=30)
    a = ap.parse_args()
    hoje = dt.date.fromisoformat(a.hoje)
    falhas, avisos = [], []

    ftxt = open(a.ficha, encoding="utf-8").read()
    fontes = tabela(ftxt, "Fontes")
    centrais = tabela(ftxt, "Afirmações centrais")
    if fontes is None:
        print("FALHA: a ficha não tem a seção '## Fontes'")
        sys.exit(1)
    if centrais is None:
        falhas.append("a ficha não tem a seção '## Afirmações centrais'")
        centrais = []

    F = {}
    for r in fontes:
        sid = col(r, "id").strip()
        if not re.fullmatch(r"S\d+", sid):
            continue
        F[sid] = {
            "status": col(r, "status").strip().lower().strip("`"),
            "url": col(r, "url"),
            "trecho": col(r, "trecho"),
            "acesso": col(r, "acesso"),
            "grupo": col(r, "group", "grupo").strip(),
            "aberto": col(r, "aberto"),
        }

    # ids citados no roteiro
    R = parse_roteiro(a.roteiro)
    citados = {}
    for ref, bloco in R["refs"]:
        for sid in re.findall(r"S\d+", ref):
            citados.setdefault(sid, set()).add(bloco)
    if not citados:
        falhas.append("o roteiro não cita nenhum id de fonte ([S1] no fim dos parágrafos com fato)")

    for sid, blocos in sorted(citados.items(), key=lambda x: int(x[0][1:])):
        if sid not in F:
            falhas.append(f"{sid} citado em B{min(blocos):02d} e ausente da tabela de fontes")
            continue
        f = F[sid]
        if f["status"] not in OK_STATUS:
            falhas.append(f"{sid} citado no roteiro com status '{f['status']}' (só verified ou partial)")

    for sid, f in F.items():
        if f["status"] not in OK_STATUS:
            continue
        faltam = [n for n in ("url", "trecho", "acesso", "grupo") if not f[n] or f[n] in ("…", '"…"')]
        if faltam:
            falhas.append(f"{sid} ({f['status']}) sem: {', '.join(faltam)}")
        if f["status"] == "partial" and not f["aberto"]:
            falhas.append(f"{sid} é partial e não diz o que foi aberto")
        if PROIBIDAS.search(f["url"]):
            falhas.append(f"{sid} usa URL de tipo proibido como fonte final: {f['url']}")
        try:
            d = dt.date.fromisoformat(f["acesso"][:10])
            if (hoje - d).days > a.dias:
                avisos.append(f"{sid} acessada em {d} (mais de {a.dias} dias): reler antes de publicar")
        except ValueError:
            if f["acesso"]:
                falhas.append(f"{sid} com data de acesso fora do formato AAAA-MM-DD: {f['acesso']}")
        if sid not in citados:
            avisos.append(f"{sid} está verificada e não é citada no roteiro")

    for c in centrais:
        cid = col(c, "id")
        if not re.fullmatch(r"C\d+", cid.strip()):
            continue
        ids = re.findall(r"S\d+", col(c, "fontes"))
        grupos = {F[i]["grupo"] for i in ids if i in F and F[i]["status"] in OK_STATUS and F[i]["grupo"]}
        if len(grupos) < 2:
            falhas.append(f"afirmação central {cid} sustentada por {len(grupos)} grupo(s) verificado(s); exigido 2")

    grupos_citados = {F[s]["grupo"] for s in citados if s in F and F[s]["grupo"]}
    if len(grupos_citados) == 1:
        avisos.append("todas as fontes citadas são do mesmo grupo de independência")

    # blocos com número e sem id
    blocos_com_id = {b for _, b in R["refs"]}
    for n, nome, _t, _s, _c in R["blocks"]:
        if n not in blocos_com_id:
            avisos.append(f"B{n:02d} ({nome}) sem nenhum id de fonte")

    print(f"\n=== fontes × texto: {a.ficha} × {a.roteiro}")
    print(f"Fontes na ficha: {len(F)} · citadas no roteiro: {len(citados)} · afirmações centrais: {len(centrais)}")
    print("\n--- RESULTADO")
    for f in falhas:
        print("FALHA:", f)
    for v in avisos:
        print("AVISO:", v)
    if not falhas and not avisos:
        print("OK: registro coerente (a verdade das páginas é conferida na conferência a frio).")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
