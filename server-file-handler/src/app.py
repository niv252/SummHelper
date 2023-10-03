import time
from controllers.text_summary_controller import summarize_text
import os
import json

# Function to check for new files in a folder
def check_for_new_files(folder_path):
    files = set(os.listdir(folder_path))
    print("ready")
    while True:
        try:
            time.sleep(0.1)  # Adjust the interval based on your needs
            new_files = set(os.listdir(folder_path))
            # Check for new files by comparing the sets
            diff = new_files - files
            files = new_files
            if diff:
                for filename in diff:
                    if "result" in filename:
                            continue
                    with open(folder_path+"/"+filename, 'r') as file:
                        json_content = json.load(file)
                    file_name = os.path.splitext(filename)[0]
                    results = summarize_text(json_content["doc_text"], json_content["highlight_spans"])
                    json_to_write = {
                        "result": results[0],
                        "indexes": results[1],
                        "alignments": results[2]
                    }
                    json_object = json.dumps(json_to_write, indent=4)
                    with open(folder_path+'/'+file_name+'_result.json', 'w+') as outfile:
                        outfile.write(json_object)
        except Exception as e:
            print("error")

try:
    check_for_new_files('../files')
except KeyboardInterrupt:
    print("Monitoring stopped.")
