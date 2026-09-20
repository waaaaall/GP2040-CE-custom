#ifndef _SPLASH_ANIM_H_
#define _SPLASH_ANIM_H_

#include <stdint.h>
#include <stdbool.h>

#define FLASH_SPLASH_MAGIC  0x53504C53 // "SPLS"
#define FLASH_SPLASH_ADDR   0x10100000

#pragma pack(push, 1)
struct FlashSplashHeader {
    uint32_t magic;          // 0x53504C53 ("SPLS")
    uint16_t version;        // 1
    uint16_t frame_count;    // Number of frames
    uint32_t total_duration; // Total animation duration in ms
    uint16_t width;          // 128
    uint16_t height;         // 64
    uint16_t frame_size;     // 1024
    uint16_t reserved;       // 0
};
#pragma pack(pop)

static inline bool hasFlashSplashAnim() {
    const volatile FlashSplashHeader* h = (const volatile FlashSplashHeader*)FLASH_SPLASH_ADDR;
    return (h->magic == FLASH_SPLASH_MAGIC && h->frame_count > 0 && h->total_duration > 0);
}

#endif // _SPLASH_ANIM_H_
