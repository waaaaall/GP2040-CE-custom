#include "SplashScreen.h"

#include "pico/stdlib.h"

#if __has_include("splash_anim.h")
#include "splash_anim.h"
#endif

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
    if (getDisplayOptions().splashMode == static_cast<SplashMode>(SPLASH_MODE_NONE)) {
        getRenderer()->drawText(0, 4, " Splash NOT enabled.");
        return;
    }

#if defined(SPLASH_ANIM_ENABLED) && (SPLASH_ANIM_ENABLED == 1)
    // Animated splash screen
    uint32_t elapsed = getMillis() - splashStartTime;
#if defined(SPLASH_ANIM_TOTAL_DURATION_MS) && (SPLASH_ANIM_TOTAL_DURATION_MS > 0)
    uint32_t loopTime = elapsed % SPLASH_ANIM_TOTAL_DURATION_MS;
    uint16_t frame = 0;
    for (uint16_t i = 0; i < SPLASH_ANIM_FRAME_COUNT; i++) {
        if (loopTime < splash_anim_cumulative[i]) {
            frame = i;
            break;
        }
    }
    currentFrame = frame;
#else
    currentFrame = 0;
#endif
    getRenderer()->drawSprite((uint8_t*)splash_anim_frames[currentFrame], 128, 64, 16, 0, 0, 1);
#else
    int splashMode = getDisplayOptions().splashMode;
    int splashSpeed = 40;
    if (splashMode == SPLASH_MODE_STATIC) {
        // Default, display static or custom image
        getRenderer()->drawSprite((uint8_t*) getDisplayOptions().splashImage.bytes, 128, 64, 16, 0, 0, 1);
    } else if (splashMode == SPLASH_MODE_CLOSEIN) {
        // Close-in. Animate the GP2040 logo
        int timeMS = getMillis();
        getRenderer()->drawSprite((uint8_t *)bootLogoTop, 43, 39, 6, 43, std::min<int>((timeMS / splashSpeed) - 39, 0), 1);
        getRenderer()->drawSprite((uint8_t *)bootLogoBottom, 128, 35, 10, 0, std::max<int>(64 - (timeMS / (splashSpeed * 2)), 30), 1);
    } else if (splashMode == SPLASH_MODE_CLOSEINCUSTOM) {
        // Close-in on custom image or delayed close-in if custom image does not exist
        getRenderer()->drawSprite((uint8_t*) getDisplayOptions().splashImage.bytes, 128, 64, 16, 0, 0, 1);
        int timeMS = getMillis();
        if (timeMS > 1000) {
            int offsetMS = timeMS - 1000;
            getRenderer()->drawRectangle(0, 63, 127, 62 - (offsetMS / (splashSpeed * 2)), 0, 1);
            getRenderer()->drawSprite((uint8_t *)bootLogoBottom, 128, 35, 10, 0, std::max<int>(64 - (timeMS / splashSpeed), 20), 1);
        }
    }
#endif
}

int8_t SplashScreen::update() {
    // If splash mode is disabled in WebConfig, go directly to BUTTONS screen
    if (getDisplayOptions().splashMode == static_cast<SplashMode>(SPLASH_MODE_NONE)) {
        return DisplayMode::BUTTONS;
    }

    if (!configMode) {
#if defined(SPLASH_ANIM_ENABLED) && (SPLASH_ANIM_ENABLED == 1)
        // Keep looping animated splash screen indefinitely (do not transition to BUTTONS)
        return -1;
#else
        uint32_t elapsedDuration = getMillis() - splashStartTime;
        uint32_t splashDuration = getDisplayOptions().splashDuration;
        if (splashDuration != 0 && (elapsedDuration >= splashDuration)) {
            return DisplayMode::BUTTONS;
        }
#endif
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
    return -1; // -1 means no change in screen state
}

