# Scripts - NUMBER

Numbers can be integers or floating-point. MyDefrag uses 64-bit precision for
  all numbers, maximum value is 9223372036854775807 for an integer and
  1.7976931348623158e+308 for a floating-point.

### Syntax

```mydfrg
[0123456789]+
[0123456789]*"."[0123456789]+(( "d" | "D" | "e" | "E" )("-"|"+")?[0123456789]+)?
```

The following multipliers can be appended to a number:

| K | kilo, 1 000 |
| --- | --- |
| M | mega, 1 000 000 |
| G | giga, 1 000 000 000 |
| T | tera, 1 000 000 000 000 |
| P | peta, 1 000 000 000 000 000 |
| E | exa, 1 000 000 000 000 000 000 |
| Z | zetta, 1 000 000 000 000 000 000 000 |
| Y | yotta, 1 000 000 000 000 000 000 000 000 |
| KB | kilobyte, 1 024 |
| MB | megabyte, 1 048 576 |
| GB | gigabyte, 1 073 741 824 |
| TB | terabyte, 1 099 511 627 776 |
| PB | petabyte, 1 125 899 906 842 624 |
| EB | exabyte, 1 152 921 504 606 846 976 |
| ZB | zettabyte, 1 180 591 620 717 411 303 424 |
| YB | yottabyte, 1 208 925 819 614 629 174 706 176 |
| Ki | kibi, 1 024 |
| Mi | mebi, 1 048 576 |
| Gi | gibi, 1 073 741 824 |
| Ti | tebi, 1 099 511 627 776 |
| Pi | pebi, 1 125 899 906 842 624 |
| Ei | exbi, 1 152 921 504 606 846 976 |
| Zi | zebi, 1 180 591 620 717 411 303 424 |
| Yi | yobi, 1 208 925 819 614 629 174 706 176 |

### Example

```mydfrg
100
34.553
20M        # 20 million bytes
20MB       # 20 megabytes
100Gi      # 100 gibibytes
-6.88153E2
```

### Variables and pre-defined numbers

You can store values in variables and then use the variables in expressions.
  Also, there is a long list of pre-defined variables. For more information see

[**Variables**](Variables.md)

.

### Arithmetic

The following arithmetic operators are available. All arithmetic is performed using
  64-bit floating point numbers.

| Operator | Description | Example | Result |
| --- | --- | --- | --- |
| + | Addition | 5 + 3 | 8 |
| - | Subtraction | 5 - 3 | 2 |
| * | Multiplication | 5 * 3 | 15 |
| / | Division | 5 / 3 | 1.66666666 |
| % | Remainder | 5 % 3 | 2 |

### Minimum and Maximum

The "Minimum" and "Maximum" functions take a series of numbers (1 or more) separated
  by comma's and return the lowest or highest number.

| Syntax | Example |
| --- | --- |
| Minimum([NUMBER](NUMBER.md) [ , [NUMBER](NUMBER.md) ] ) | Minimum(1000,900,1200) |
| Maximum([NUMBER](NUMBER.md) [ , [NUMBER](NUMBER.md) ] ) | Maximum(1000,900,1200) |

### RoundDown and RoundUp

These functions take the first NUMBER and round it down/up to a multiple of the second NUMBER.
  For example, if the first number is 15 and the second number is 4, then RoundUp will
  round up to 16, because that is the first-next multiple of 4.
  The "RoundDown" and "RoundUp" functions can for example be used when calculating the
  beginning of a zone. They round the beginning of a zone down/up, so it will be the same
  for many runs of MyDefrag and reduce the amount of data movement.

| Syntax | Example |
| --- | --- |
| RoundDown([NUMBER](NUMBER.md) , [NUMBER](NUMBER.md)) | RoundDown(ZoneEnd + ZoneSize * 0.1 , VolumeSize * 0.01) |
| RoundUp([NUMBER](NUMBER.md) , [NUMBER](NUMBER.md)) | RoundUp(ZoneEnd + ZoneSize * 0.1 , VolumeSize * 0.01) |

### See also:

[**Variables**](Variables.md)

[**Macros**](Macros.md)

[**Scripts**](../../manual/Scripts.md)
