import serial
import json
from flask import Flask, jsonify
import logging
from serial.tools import list_ports
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SerialManager:
    def __init__(self, port="COM9", baud_rate=115200):
        self.port = port
        self.baud_rate = baud_rate
        self.serial_connection = None
        self.last_valid_reading = {"temperatura": 0, "umidade": 0, "gas": 0}
    
    def connect(self):
        max_retries = 3
        for attempt in range(max_retries):
            try:
                if self.serial_connection and self.serial_connection.is_open:
                    self.serial_connection.close()
                
                self.serial_connection = serial.Serial(
                    self.port,
                    self.baud_rate,
                    timeout=2
                )
                logger.info(f"Successfully connected to {self.port}")
                return True
            except serial.SerialException as e:
                logger.error(f"Attempt {attempt + 1}/{max_retries}: Failed to connect to {self.port}: {e}")
                time.sleep(2)  
        return False
    
    def read_data(self):
        try:
            if not self.serial_connection or not self.serial_connection.is_open:
                if not self.connect():
                    return self.last_valid_reading
            
            if self.serial_connection.in_waiting:  
                line = self.serial_connection.readline().decode("utf-8").strip()
                if line:
                    try:
                        data = json.loads(line)
                        if "temperatura" in data:
                            self.last_valid_reading = data
                            logger.info(f"New reading: {data}")
                            return data
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON received: {line}")
            
        except serial.SerialException as e:
            logger.error(f"Serial communication error: {e}")
            self.serial_connection = None 
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        
        return self.last_valid_reading


serial_manager = SerialManager(port="COM9")

@app.route('/data', methods=['GET'])
def get_sensor_data():
    return jsonify(serial_manager.read_data())

@app.route('/connect', methods=['GET'])
def try_connect():
    success = serial_manager.connect()
    return jsonify({"success": success, "port": serial_manager.port})

if __name__ == '__main__':
    if not serial_manager.connect():
        logger.warning("Could not establish initial serial connection. Will retry on data requests.")
    
    app.run(host="0.0.0.0", port=5000, debug=False)  