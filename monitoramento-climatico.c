#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "ssd1306_i2c.h"
#include "ssd1306.h"
#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "ws2818b.pio.h"  
#include "hardware/pwm.h"

#define DHT_PIN 28   
#define MQ2_D0 20    
#define BTN_PIN 5    
#define LED_COUNT 25
#define LED_PIN 7
#define BUZZER_PIN 21
#define BUZZER_FREQUENCY 4000

const uint I2C_SDA = 14;
const uint I2C_SCL = 15;

int tela_atual = 0; 
struct pixel_t {
    uint8_t G, R, B;
};
typedef struct pixel_t pixel_t;
typedef pixel_t npLED_t;

npLED_t leds[LED_COUNT];
PIO np_pio;
uint sm;

void pwm_init_buzzer(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice_num = pwm_gpio_to_slice_num(pin);
    pwm_config config = pwm_get_default_config();
    pwm_config_set_clkdiv(&config, clock_get_hz(clk_sys) / (BUZZER_FREQUENCY * 4096)); 
    pwm_init(slice_num, &config, true);
    pwm_set_gpio_level(pin, 0);
}

void beep(uint pin, uint duration_ms) {
    uint slice_num = pwm_gpio_to_slice_num(pin);
    pwm_set_gpio_level(pin, 2048);
    sleep_ms(duration_ms);
    pwm_set_gpio_level(pin, 0);
    sleep_ms(100); 
}

int getIndex(int x, int y) {
    if (y % 2 == 0) {
        return y * 5 + x;  
    } else {
        return y * 5 + (4 - x);  
    }
}

void npInit(uint pin) {
    uint offset = pio_add_program(pio0, &ws2818b_program);
    np_pio = pio0;
    sm = pio_claim_unused_sm(np_pio, false);
    if (sm < 0) {
        np_pio = pio1;
        sm = pio_claim_unused_sm(np_pio, true);
    }
    ws2818b_program_init(np_pio, sm, offset, pin, 800000.f);
    
    for (uint i = 0; i < LED_COUNT; ++i) {
        leds[i].R = 0;
        leds[i].G = 0;
        leds[i].B = 0;
    }
}

void npSetLED(const uint index, const uint8_t r, const uint8_t g, const uint8_t b) {
    leds[index].R = r;
    leds[index].G = g;
    leds[index].B = b;
}

void npClear() {
    for (uint i = 0; i < LED_COUNT; ++i)
        npSetLED(i, 0, 0, 0);
}

void npWrite() {
    for (uint i = 0; i < LED_COUNT; ++i) {
        pio_sm_put_blocking(np_pio, sm, leds[i].G);
        pio_sm_put_blocking(np_pio, sm, leds[i].R);
        pio_sm_put_blocking(np_pio, sm, leds[i].B);
    }
    sleep_us(100); 
}

void drawPixel(int x, int y, uint8_t r, uint8_t g, uint8_t b) {
    if (x >= 0 && x < 5 && y >= 0 && y < 5) {
        int index = getIndex(x, y);
        npSetLED(index, r, g, b);
    }
}

struct dht11_data {
    int temperature;
    int humidity;
};

static uint8_t read_byte() {
    uint8_t byte = 0;
    for (int i = 0; i < 8; i++) {
        while (gpio_get(DHT_PIN) == 0);
        sleep_us(30);
        if (gpio_get(DHT_PIN) == 1) {
            byte |= (1 << (7 - i));
        }
        while (gpio_get(DHT_PIN) == 1);
    }
    return byte;
}

bool read_dht11_data(struct dht11_data *result) {
    uint8_t data[5] = {0};

    gpio_set_dir(DHT_PIN, GPIO_OUT);
    gpio_put(DHT_PIN, 1);
    sleep_ms(250);  

    gpio_put(DHT_PIN, 0);
    sleep_ms(18);  
    gpio_put(DHT_PIN, 1);
    sleep_us(40);  
    gpio_set_dir(DHT_PIN, GPIO_IN);

    int timeout = 0;
    while (gpio_get(DHT_PIN) == 1) {
        if (++timeout > 2000) return false;  
        sleep_us(1);
    }

    timeout = 0;
    while (gpio_get(DHT_PIN) == 0) {
        if (++timeout > 2000) return false;
        sleep_us(1);
    }

    timeout = 0;
    while (gpio_get(DHT_PIN) == 1) {
        if (++timeout > 2000) return false;
        sleep_us(1);
    }

    for (int i = 0; i < 5; i++) {
        for (int j = 7; j >= 0; j--) {
            timeout = 0;
            while (gpio_get(DHT_PIN) == 0) {
                if (++timeout > 2000) return false;
                sleep_us(1);
            }

            sleep_us(35);  

            if (gpio_get(DHT_PIN) == 1) {
                data[i] |= (1 << j);  
            }

            timeout = 0;
            while (gpio_get(DHT_PIN) == 1) {
                if (++timeout > 2000) return false;
                sleep_us(1);
            }
        }
    }

    uint8_t checksum = data[0] + data[1] + data[2] + data[3];
    if (data[4] != (checksum & 0xFF)) {
        printf("❌ Erro de checksum no DHT11\n");
        return false;
    }

    result->humidity = data[0];        
    result->temperature = data[2];     

    return true;
}


void exibir_oled(struct render_area *frame_area, uint8_t *buffer, int temp, int hum, int mq2_status) {
    memset(buffer, 0, ssd1306_buffer_length);
    
    char msg_buffer[32];     
    char value_buffer[32];  
    char line_buffer[32];   
    int display_width = ssd1306_width;    
    int display_height = ssd1306_height;  
    int char_width = 6;  
    int char_height = 8; 
    int x_pos, y_pos;
    
    switch (tela_atual) {
        case 0:
            snprintf(msg_buffer, sizeof(msg_buffer), "Temp: %dC", temp);
            x_pos = (display_width - (strlen(msg_buffer) * char_width)) / 2;
            y_pos = 10;  
            ssd1306_draw_string(buffer, x_pos, y_pos, msg_buffer);
            
            snprintf(msg_buffer, sizeof(msg_buffer), "Umid: %d%%", hum);
            x_pos = (display_width - (strlen(msg_buffer) * char_width)) / 2;
            y_pos = display_height / 2 - char_height;  
            ssd1306_draw_string(buffer, x_pos, y_pos, msg_buffer);
            
            snprintf(msg_buffer, sizeof(msg_buffer), "Gas: %s", mq2_status ? "Normal" : "DETECTADO!");
            x_pos = (display_width - (strlen(msg_buffer) * char_width)) / 2;
            y_pos = display_height - (2 * char_height); 
            ssd1306_draw_string(buffer, x_pos, y_pos, msg_buffer);
            break;

            
        case 1:
            snprintf(msg_buffer, sizeof(msg_buffer), "Umidade");
            x_pos = (display_width - (strlen(msg_buffer) * char_width)) / 2;
            y_pos = (display_height / 2) - char_height;
            ssd1306_draw_string(buffer, x_pos, y_pos, msg_buffer);
            
            snprintf(value_buffer, sizeof(value_buffer), "%d%%", hum);
            x_pos = (display_width - (strlen(value_buffer) * char_width)) / 2;
            y_pos = (display_height / 2) + char_height;
            ssd1306_draw_string(buffer, x_pos, y_pos, value_buffer);
            break;
            
        case 2:
            snprintf(msg_buffer, sizeof(msg_buffer), "Gas");
            x_pos = (display_width - (strlen(msg_buffer) * char_width)) / 2;
            y_pos = (display_height / 2) - char_height;
            ssd1306_draw_string(buffer, x_pos, y_pos, msg_buffer);
            
            snprintf(value_buffer, sizeof(value_buffer), "%s", 
                    mq2_status ? "Normal" : "Detectado!");
            x_pos = (display_width - (strlen(value_buffer) * char_width)) / 2;
            y_pos = (display_height / 2) + char_height;
            ssd1306_draw_string(buffer, x_pos, y_pos, value_buffer);
            break;
            
        case 3:
            snprintf(msg_buffer, sizeof(msg_buffer), "Temperatura");
            x_pos = (display_width - (strlen(msg_buffer) * char_width)) / 2;
            y_pos = (display_height / 2) - char_height;
            ssd1306_draw_string(buffer, x_pos, y_pos, msg_buffer);
            
            snprintf(value_buffer, sizeof(value_buffer), "%dC", temp);
            x_pos = (display_width - (strlen(value_buffer) * char_width)) / 2;
            y_pos = (display_height / 2) + char_height;
            ssd1306_draw_string(buffer, x_pos, y_pos, value_buffer);
            break;
    }

    render_on_display(buffer, frame_area);
}

bool botao_pressionado() {
    static bool ultimo_estado = true; 
    
    bool estado_atual = gpio_get(BTN_PIN);
    
    if (estado_atual == 0 && ultimo_estado == 1) { 
        sleep_ms(50); 
        if (gpio_get(BTN_PIN) == 0) { 
            ultimo_estado = 0;
            return true;
        }
    }

    if (estado_atual == 1) {
        ultimo_estado = 1; 
    }

    return false;
}

void enviar_dados_serial(int temperatura, int umidade, int gas_detectado) {
    printf("{\"temperatura\": %d, \"umidade\": %d, \"gas\": %d}\n",
           temperatura, umidade, gas_detectado);
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    pwm_init_buzzer(BUZZER_PIN);

    i2c_init(i2c1, ssd1306_i2c_clock * 1000);
    gpio_set_function(I2C_SDA, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(I2C_SDA);
    gpio_pull_up(I2C_SCL);

    ssd1306_init();

    struct render_area frame_area = {
        .start_column = 0,
        .end_column = ssd1306_width - 1,
        .start_page = 0,
        .end_page = ssd1306_n_pages - 1
    };
    calculate_render_area_buffer_length(&frame_area);

    uint8_t display_buffer[ssd1306_buffer_length];

    npInit(LED_PIN);
    npClear();
    
    gpio_init(BTN_PIN);
    gpio_set_dir(BTN_PIN, GPIO_IN);
    gpio_pull_up(BTN_PIN);

    gpio_init(DHT_PIN);
    gpio_set_dir(DHT_PIN, GPIO_OUT);
    gpio_put(DHT_PIN, 1);

    gpio_init(MQ2_D0);
    gpio_set_dir(MQ2_D0, GPIO_IN);
    gpio_pull_up(MQ2_D0);

    struct dht11_data sensor_data;

    while (true) {
        int estado_mq2 = gpio_get(MQ2_D0);
    
        if (read_dht11_data(&sensor_data)) {
            enviar_dados_serial(sensor_data.temperature, sensor_data.humidity, estado_mq2);
        }
    
        if (!estado_mq2) {
            for (int i = 0; i < 5; i++) {
                drawPixel(i, i, 255, 0, 0);
                drawPixel(i, 4-i, 255, 0, 0);
            }
            npWrite();
            beep(BUZZER_PIN, 3000);
        } else {
            npClear();
            npWrite();
        }

        exibir_oled(&frame_area, display_buffer, sensor_data.temperature, sensor_data.humidity, estado_mq2);
    
        if (botao_pressionado()) {
            tela_atual = (tela_atual + 1) % 4;
            printf("Tela alterada para: %d\n", tela_atual);
            sleep_ms(300);
        }

        sleep_ms(5000);
    }
    
    return 0;
}
