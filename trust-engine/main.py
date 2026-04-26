from fastapi import FastAPI
from pydantic import BaseModel
from scorer import calculate_score

app = FastAPI(title="Trust Engine")

class Signals(BaseModel):
    ip_changed: bool = False
    geo_distance: int = 0
    device_changed: bool = False
    request_rate: int = 0
    is_after_hours: bool = False
    successful_step_up: bool = False
    consistent_24hrs: bool = False

@app.post("/calculate_score")
def score(signals: Signals):
    # Convert Pydantic model to dict
    computed_score = calculate_score(signals.model_dump())
    return {"score": computed_score}
