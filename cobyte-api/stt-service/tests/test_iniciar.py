import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from iniciar import carregar_chave


class InicializacaoTest(unittest.TestCase):
    def carregar(self, texto):
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / ".env"
            arquivo.write_text(texto, encoding="utf-8-sig")
            carregar_chave(arquivo)

    @patch.dict(os.environ, {}, clear=True)
    def test_carrega_formatos_sem_importar_outros_segredos(self):
        for separador in ("=", ":"):
            for aspas in ('"', "'", ""):
                with self.subTest(separador=separador, aspas=aspas):
                    self.carregar(
                        '# comentario\nDB_PASSWORD=privado\n'
                        f'STT_INTERNAL_API_KEY {separador} {aspas}chave=literal{aspas}\n'
                    )
                    self.assertEqual(os.environ["STT_INTERNAL_API_KEY"], "chave=literal")
                    self.assertNotIn("DB_PASSWORD", os.environ)

    @patch.dict(os.environ, {"STT_INTERNAL_API_KEY": "ambiente"}, clear=True)
    def test_arquivo_tem_precedencia_inclusive_valor_vazio(self):
        self.carregar("STT_INTERNAL_API_KEY=arquivo")
        self.assertEqual(os.environ["STT_INTERNAL_API_KEY"], "arquivo")
        self.carregar("STT_INTERNAL_API_KEY=")
        self.assertEqual(os.environ["STT_INTERNAL_API_KEY"], "")

    @patch.dict(os.environ, {"STT_INTERNAL_API_KEY": "ambiente"}, clear=True)
    def test_preserva_ambiente_sem_configuracao_no_arquivo(self):
        self.carregar("DB_USERNAME=usuario")
        self.assertEqual(os.environ["STT_INTERNAL_API_KEY"], "ambiente")

    def test_rejeita_duplicatas_e_aspas_incompletas(self):
        for texto in ('STT_INTERNAL_API_KEY=\nSTT_INTERNAL_API_KEY=outra',
                      'STT_INTERNAL_API_KEY="incompleta'):
            with self.subTest(texto=texto), self.assertRaises(ValueError):
                self.carregar(texto)

    @patch.dict(os.environ, {}, clear=True)
    def test_trata_expressoes_como_texto(self):
        self.carregar('STT_INTERNAL_API_KEY=$(comando); %PATH%')
        self.assertEqual(os.environ["STT_INTERNAL_API_KEY"], '$(comando); %PATH%')
