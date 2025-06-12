# DL_LoRA_Symbolic_Music_Generation

## Course Project for Deep Learning

This is a platform for testing the performances of different LORA models on symbolic music generation. It supports text to ABC format, as well as MIDI music to ABC format music generation.
We provide code for our base model, data processing tools, as well as our frontend interface.

## Requirements

Easyabc\
abcm2ps\
ghostscript\
abc2midi\
timidity

## Usage

### Inference

This is the main part of our demonstration. The model paths should be adjusted to suit your own needs.
```
cd Chat-Musician/
python model/infer/predict.py --base_model {merged_model_path} --with_prompt --interactive --flask
```
For more details, check out the `README` file in `ChatMusician-main` folder.

### Running the frontend

```
cd DL_LoRA_Symbolic_Music_Generation
python backend.py
```
For generated samples, check out `static/tmp/` and `static/mp3/` folders.

## Important Notes

1. Our model checkpoints can be found at https://cloud.tsinghua.edu.cn/d/5efe8937f4304dd495a9/.
2. To ensure smooth rendering of our front end and better user experience, we recommend that you open our code in a Google browser.
3. For more demos, go to our GitHub repository https://github.com/yishizhennan/DL_LoRA_Symbolic_Music_Generation/.
