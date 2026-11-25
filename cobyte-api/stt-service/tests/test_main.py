import io
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
import main
from app.config import Settings
from app.services.model_loader import carregar_modelo as carregar_modelo_service


class SttTest(unittest.TestCase):
    def setUp(self):
        self.modelo = Mock()
        self.modelo.transcribe.return_value = (
            iter([SimpleNamespace(text=" Olá "), SimpleNamespace(text=" mundo ")]),
            SimpleNamespace(duration=2.5, language_probability=1.0),
        )
        self.patch_modelo = patch("main.carregar_modelo", return_value=self.modelo)
        self.patch_modelo.start()
        self.client = TestClient(main.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.patch_modelo.stop()

    def enviar(self, nome="audio.wav", conteudo=b"audio"):
        return self.client.post(
            "/transcrever",
            files={"arquivo": (nome, io.BytesIO(conteudo), "audio/wav")},
        )

    def test_health_check(self):
        resposta = self.client.get("/health")
        self.assertEqual(200, resposta.status_code)
        dados = resposta.json()
        self.assertEqual("ok", dados["status"])
        self.assertTrue(dados["model_loaded"])
        self.assertIn("device", dados)

    def test_sucesso_portugues_e_limpeza(self):
        resposta = self.enviar("../../ligacao.WAV")
        self.assertEqual(200, resposta.status_code)
        self.assertEqual(
            {
                "nomeArquivo": "ligacao.WAV",
                "duracaoSegundos": 2.5,
                "idioma": "pt",
                "probabilidadeIdioma": 1.0,
                "transcricao": "Olá mundo",
            },
            resposta.json(),
        )
        args, kwargs = self.modelo.transcribe.call_args
        self.assertEqual("pt", kwargs["language"])
        self.assertTrue(kwargs["vad_filter"])
        self.assertFalse(kwargs["condition_on_previous_text"])
        self.assertEqual(0.0, kwargs["temperature"])
        self.assertFalse(os.path.exists(args[0]))

    def test_silencio_nao_retorna_transcricao_inventada(self):
        self.modelo.transcribe.return_value = (
            iter([]),
            SimpleNamespace(duration=3, language_probability=1),
        )
        resposta = self.enviar()
        self.assertEqual(422, resposta.status_code)
        self.assertIn("Não foi detectada fala", resposta.json()["detail"])
        self.assertFalse(os.path.exists(self.modelo.transcribe.call_args.args[0]))

    def test_segmentos_sem_fala_ou_baixa_confianca_sao_descartados(self):
        for attrs in [
            dict(no_speech_prob=0.95, avg_logprob=-0.1),
            dict(no_speech_prob=0.1, avg_logprob=-1.5),
        ]:
            with self.subTest(attrs=attrs):
                self.modelo.transcribe.return_value = (
                    iter(
                        [
                            SimpleNamespace(
                                text="Legendas pela comunidade de Amara.org", **attrs
                            )
                        ]
                    ),
                    SimpleNamespace(duration=3, language_probability=1),
                )
                self.assertEqual(422, self.enviar().status_code)

    def test_preserva_fala_valida_entre_segmentos_descartados(self):
        self.modelo.transcribe.return_value = (
            iter(
                [
                    SimpleNamespace(text=" Primeiro ", no_speech_prob=0.2, avg_logprob=-0.3),
                    SimpleNamespace(text="Ruído", no_speech_prob=0.9, avg_logprob=-0.2),
                    SimpleNamespace(text="Incerto", no_speech_prob=0.2, avg_logprob=-1.5),
                    SimpleNamespace(text=" segundo ", no_speech_prob=0.1, avg_logprob=-0.4),
                ]
            ),
            SimpleNamespace(duration=5, language_probability=1),
        )

        resposta = self.enviar()

        self.assertEqual(200, resposta.status_code)
        self.assertEqual("Primeiro segundo", resposta.json()["transcricao"])

    def test_extensao_invalida(self):
        self.assertEqual(415, self.enviar("arquivo.exe").status_code)
        self.modelo.transcribe.assert_not_called()

    def test_vazio_e_ausente(self):
        self.assertEqual(400, self.enviar(conteudo=b"").status_code)
        self.assertEqual(422, self.client.post("/transcrever").status_code)

    def test_tamanho_limitado(self):
        with patch("main.MAX_BYTES", 3):
            self.assertEqual(413, self.enviar(conteudo=b"grande").status_code)
        self.modelo.transcribe.assert_not_called()

    def test_decoder_invalido_remove_temporario(self):
        self.modelo.transcribe.side_effect = ValueError("erro privado")
        resposta = self.enviar()
        self.assertEqual(422, resposta.status_code)
        self.assertNotIn("erro privado", resposta.text)
        self.assertFalse(os.path.exists(self.modelo.transcribe.call_args.args[0]))

    def test_erro_ao_iterar_segmentos_remove_temporario(self):
        def segmentos():
            raise RuntimeError("conteúdo privado")
            yield

        self.modelo.transcribe.return_value = (
            segmentos(),
            SimpleNamespace(duration=1, language_probability=1),
        )
        self.assertEqual(500, self.enviar().status_code)
        self.assertFalse(os.path.exists(self.modelo.transcribe.call_args.args[0]))

    def test_ocupado_retorna503(self):
        main.app.state.vaga.acquire()
        try:
            self.assertEqual(503, self.enviar().status_code)
        finally:
            main.app.state.vaga.release()

    def test_duracao_excessiva(self):
        self.modelo.transcribe.return_value = (
            iter([]),
            SimpleNamespace(duration=601, language_probability=1),
        )
        self.assertEqual(422, self.enviar().status_code)
        self.assertFalse(os.path.exists(self.modelo.transcribe.call_args.args[0]))


class ModeloConfigurationTest(unittest.TestCase):
    def test_cpu_cuda_offline(self):
        for device, compute in [("cpu", "int8"), ("cuda", "float16")]:
            for modelo_local in (False, True):
                with self.subTest(device=device, modelo_local=modelo_local):
                    whisper = Mock()
                    settings = Settings(device=device, model_path="")
                    with patch("app.services.model_loader.Path.is_file", return_value=modelo_local), patch.dict(
                        sys.modules,
                        {"faster_whisper": SimpleNamespace(WhisperModel=whisper)},
                    ):
                        carregar_modelo_service(settings)
                    origem = str(Path(__file__).resolve().parents[1] / "models" / "small") if modelo_local else "small"
                    whisper.assert_called_once_with(
                        origem, device=device, compute_type=compute, local_files_only=True
                    )

    def test_device_invalido(self):
        with self.assertRaises(RuntimeError):
            Settings(device="outro").validate()

    def test_modelo_local_incompleto(self):
        with self.assertRaises(RuntimeError):
            Settings(device="cpu", model_path="modelo-inexistente").validate()


if __name__ == "__main__":
    unittest.main()
