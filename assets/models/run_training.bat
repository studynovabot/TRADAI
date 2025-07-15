@echo off
echo ========================================
echo Professional AI Trading Model Training
echo ========================================

echo.
echo Installing required packages...
pip install -r training_requirements.txt

echo.
echo Starting training process...
python professional-ai-trainer.py

echo.
echo Training completed! Check the results.
pause
