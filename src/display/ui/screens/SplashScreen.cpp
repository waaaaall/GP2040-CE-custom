#include "SplashScreen.h"

#include "pico/stdlib.h"

#include "splash_anim.h"

void SplashScreen::init() {
    getRenderer()->clearScreen();
    splashStartTime = getMillis();
    configMode = Storage::getInstance().GetConfigMode();
    currentFrame = 0;
}

void SplashScreen::shutdown() {
    clearElements();
}

void SplashScreen::drawScreen() {
    if (hasFlashSplashAnim()) {
        const FlashSplashHeader* header = (const FlashSplashHeader*)FLASH_SPLASH_ADDR;
        uint32_t elapsed = getMillis() - splashStartTime;
        uint32_t loopTime = elapsed % header->total_duration;
        const uint32_t* cumulative = (const uint32_t*)((const uint8_t*)header + sizeof(FlashSplashHeader));
        uint16_t frame = 0;
        for (uint16_t i = 0; i < header->frame_count; i++) {
            if (loopTime < cumulative[i]) {
                frame = i;
                break;
            }
        }
        currentFrame = frame;
        const uint8_t* frames_data = ((const uint8_t*)cumulative) + (header->frame_count * sizeof(uint32_t));
        const uint8_t* frame_ptr = frames_data + (currentFrame * header->frame_size);
        getRenderer()->drawSprite((uint8_t*)frame_ptr, header->width, header->height, 16, 0, 0, 1);
        return;
    }

    int splashMode = getDisplayOptions().splashMode;
    int splashSpeed = 40;
    if (splashMode == SPLASH_MODE_STATIC) {
        getRenderer()->drawSprite((uint8_t*) getDisplayOptions().splashImage.bytes, 128, 64, 16, 0, 0, 1);
    } else if (splashMode == SPLASH_MODE_CLOSEIN) {
        int timeMS = getMillis();
        getRenderer()->drawSprite((uint8_t *)bootLogoTop, 43, 39, 6, 43, std::min<int>((timeMS / splashSpeed) - 39, 0), 1);
        getRenderer()->drawSprite((uint8_t *)bootLogoBottom, 128, 35, 10, 0, std::max<int>(64 - (timeMS / (splashSpeed * 2)), 30), 1);
    } else if (splashMode == SPLASH_MODE_CLOSEINCUSTOM) {
        getRenderer()->drawSprite((uint8_t*) getDisplayOptions().splashImage.bytes, 128, 64, 16, 0, 0, 1);
        int timeMS = getMillis();
        if (timeMS > 1000) {
            int offsetMS = timeMS - 1000;
            getRenderer()->drawRectangle(0, 63, 127, 62 - (offsetMS / (splashSpeed * 2)), 0, 1);
            getRenderer()->drawSprite((uint8_t *)bootLogoBottom, 128, 35, 10, 0, std::max<int>(64 - (timeMS / splashSpeed), 20), 1);
        }
    }
}

int8_t SplashScreen::update() {
    if (hasFlashSplashAnim()) {
        if (!configMode) {
            // Keep looping animated splash screen indefinitely (do not transition to BUTTONS)
            return -1;
        } else {
            uint16_t buttonState = getGamepad()->state.buttons;
            if (prevButtonState && !buttonState) {
                if (prevButtonState == GAMEPAD_MASK_B2) {
                    prevButtonState = 0;
                    return DisplayMode::CONFIG_INSTRUCTION;
                }
            }
            prevButtonState = buttonState;
        }
        return -1;
    }

    if (getDisplayOptions().splashMode == static_cast<SplashMode>(SPLASH_MODE_NONE)) {
        return DisplayMode::BUTTONS;
    }

    if (!configMode) {
        uint32_t elapsedDuration = getMillis() - splashStartTime;
        uint32_t splashDuration = getDisplayOptions().splashDuration;
        if (splashDuration != 0 && (elapsedDuration >= splashDuration)) {
            return DisplayMode::BUTTONS;
        }
    } else {
        uint16_t buttonState = getGamepad()->state.buttons;
        if (prevButtonState && !buttonState) {
            if (prevButtonState == GAMEPAD_MASK_B2) {
                prevButtonState = 0;
                return DisplayMode::CONFIG_INSTRUCTION;
            }
        }
        prevButtonState = buttonState;
    }
    return -1;
}
