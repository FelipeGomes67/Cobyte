# 42dot Sans PT para o Cobyte
Os arquivos WOFF2 já estão prontos em public/fonts. Node/Vite não precisam de Python para executar ou compilar o site.

A edição local preserva os contornos e métricas das letras latinas originais e acrescenta acentos portugueses. Os pesos 300 a 800 são arquivos reais, não negrito sintético. O conjunto coreano foi excluído do pacote do site; idiomas fora do conjunto latino continuam usando as fontes de fallback.

Para regenerar, instale as dependências de requirements.txt em um ambiente Python e execute:

    python tools/fonts/build_42dot_pt.py

A fonte oficial é baixada para o diretório temporário do sistema, com SHA-256 verificado. TTFs intermediários ficam nesse mesmo diretório; somente WOFF2 é publicado. Não é necessário usar FontForge.
Os arquivos build-manifest.json, NOTICE.txt e OFL-42dot-Sans.txt registram origem, modificações e licença.

O gerador verifica a cobertura dos acentos e compara os contornos e métricas de cada glifo original retido. Acrescenta regras ccmp para combinar letras e acentos recebidos separadamente (Unicode NFD), preservando os recursos OpenType existentes.
