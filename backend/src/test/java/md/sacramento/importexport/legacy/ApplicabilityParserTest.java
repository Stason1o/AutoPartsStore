package md.sacramento.importexport.legacy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/** Фикстуры — реальные названия из учётного файла «наличие». */
class ApplicabilityParserTest {

    @ParameterizedTest
    // название → марка | модель | годы от/до (пусто = null)
    @CsvSource(delimiter = '@', value = {
            "Audi A4  8/97>01 kondic. radiator      @ Audi       @ A4      @ 1997 @ 2001",
            "VW TIGUAN, 11 - 16 ИНТЕРКУЛЕР          @ Volkswagen @ Tiguan  @ 2011 @ 2016",
            "TOYOTA PRIUS 2010 ПОДКРЫЛЬНИК          @ Toyota     @ Prius   @ 2010 @ 2010",
            "VW-POLO TSI   09- intercooler          @ Volkswagen @ Polo    @ 2009 @",
            "Audi 80 8/91> радиатор кондиционера    @ Audi       @ 80      @ 1991 @",
            "Audi 100 82> пёрёдн. панель            @ Audi       @ 100     @ 1982 @",
            "VW-SHARAN 1.9 TDI 95- интеркулер       @ Volkswagen @ Sharan  @ 1995 @",
            "audi q5 80a решетка бампера            @ Audi       @ Q5      @      @",
            "VW JETTA, 11 - подкрыльник             @ Volkswagen @ Jetta   @ 2011 @",
            "повторитель Porsche Cayenne            @ Porsche    @ Cayenne @      @",
            "KIA Sportage 16-21 фара                @ Kia        @ Sportage @ 2016 @ 2021",
    })
    void parsesRealWorldNames(String name, String make, String model, Integer yearFrom, Integer yearTo) {
        var parsed = ApplicabilityParser.parse(name.trim());

        assertThat(parsed).isPresent();
        assertThat(parsed.get().make()).isEqualTo(make.trim());
        assertThat(parsed.get().model()).isEqualToIgnoringCase(model.trim());
        assertThat(parsed.get().yearFrom()).isEqualTo(yearFrom);
        assertThat(parsed.get().yearTo()).isEqualTo(yearTo);
    }

    @Test
    void returnsEmptyWhenNoMakeRecognized() {
        assertThat(ApplicabilityParser.parse("подсветка номера")).isEmpty();
        assertThat(ApplicabilityParser.parse("radiator")).isEmpty();
    }
}
