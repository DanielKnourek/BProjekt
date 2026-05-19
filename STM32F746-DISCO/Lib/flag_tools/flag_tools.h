/*
 * flag_tools.h
 *
 *  Created on: Apr 4, 2023
 *      Author: Daniel Kňourek
 */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef FLAG_TOOLS_FLAG_TOOLS_H_
#define FLAG_TOOLS_FLAG_TOOLS_H_

/* Includes ------------------------------------------------------------------*/
#include <stdint.h>

/* Exported types ------------------------------------------------------------*/
typedef struct flag_set
{
	uint8_t set;
	// Function pointers for operations
	void (*set_flag)(struct flag_set *flags, uint8_t flag_mask);
	void (*reset_flag)(struct flag_set *flags, uint8_t flag_mask);
	uint8_t (*is_set)(struct flag_set *flags, uint8_t flag_mask);
} flag_set;

/* Exported constants --------------------------------------------------------*/
#define FT_Flag0 ((uint8_t)1 << 0)
#define FT_Flag1 ((uint8_t)1 << 1)
#define FT_Flag2 ((uint8_t)1 << 2)
#define FT_Flag3 ((uint8_t)1 << 3)
#define FT_Flag4 ((uint8_t)1 << 4)
#define FT_Flag5 ((uint8_t)1 << 5)
#define FT_Flag6 ((uint8_t)1 << 6)
#define FT_Flag7 ((uint8_t)1 << 7)

#define FT_BTN1 FT_Flag0
#define FT_ACTION_USER FT_Flag7
#define FT_ACTION_RECIEVE FT_Flag1

extern flag_set Flags;

/* Exported functions --------------------------------------------------------*/

// flag_set init_flags();
void init_flags(flag_set *flags);

void set_flag(flag_set *flags, uint8_t flag_mask);
void reset_flag(flag_set *flags, uint8_t flag_mask);

uint8_t is_set(flag_set *flags, uint8_t flag_mask);

#endif /* FLAG_TOOLS_FLAG_TOOLS_H_ */
