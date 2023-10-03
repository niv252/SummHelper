from pydantic import BaseSettings
from typing import Dict
import os

class Settings(BaseSettings):
    file_path: str
    nlp_special_cases: Dict[str, str] = dict()
    host: str
    port: str
    logging_level: int
    do_sample: bool
    top_p: float
    max_length: int
    num_beams: int
    length_penalty: float
    no_repeat_ngrams_size: int

env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "env")
SETTINGS = Settings(_env_file=env_file, _env_file_encoding='utf-8')