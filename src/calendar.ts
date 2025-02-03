import { LPCore } from './core'
import { DateTime } from './datetime'
import { ILPConfiguration } from './interfaces'
import * as styles from './scss/main.scss'
import { dateIsLocked, findNestedMonthItem } from './utils'

function startOfDay(date?: Date): Date {
  const d = date ? new Date(date.getTime()) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date?: Date): Date {
  const d = date ? new Date(date.getTime()) : new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export class Calendar extends LPCore {
  constructor(options: ILPConfiguration) {
    super(options);
    //
  }

  protected render() {
    this.emit('before:render', this.ui);

    const mainBlock = document.createElement('div');
    mainBlock.className = styles.containerMain;
    const months = document.createElement('div');
    months.className = styles.containerMonths;

    if (styles[`columns${this.options.numberOfColumns}`]) {
      months.classList.remove(styles.columns2, styles.columns3, styles.columns4);
      months.classList.add(styles[`columns${this.options.numberOfColumns}`]);
    }

    if (this.options.splitView) {
      months.classList.add(styles.splitView);
    }

    if (this.options.showWeekNumbers) {
      months.classList.add(styles.showWeekNumbers);
    }

    const startDate = this.calendars[0].clone();
    const startMonthIdx = startDate.getMonth();
    const totalMonths = startDate.getMonth() + this.options.numberOfMonths;

    let calendarIdx = 0;
    // tslint:disable-next-line: prefer-for-of
    for (let idx = startMonthIdx; idx < totalMonths; idx += 1) {
      let dateIterator = startDate.clone();
      dateIterator.setDate(1);
      dateIterator.setHours(0, 0, 0, 0);

      if (this.options.splitView) {
        dateIterator = this.calendars[calendarIdx].clone();
      } else {
        dateIterator.setMonth(idx);
      }

      months.appendChild(this.renderMonth(dateIterator, calendarIdx));

      calendarIdx += 1;
    }

    this.ui.innerHTML = '';

    mainBlock.appendChild(months);

    if (this.options.resetButton) {
      let resetButton;
      if (typeof this.options.resetButton === 'function') {
        resetButton = this.options.resetButton.call(this);
      } else {
        resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = styles.resetButton;
        resetButton.innerHTML = this.options.buttonText.reset;
      }

      resetButton.addEventListener('click', (e) => {
        e.preventDefault();

        // tslint:disable-next-line: no-string-literal
        this['clearSelection']();
      });

      mainBlock
        .querySelector(`.${styles.monthItem}:last-child`)
        .querySelector(`.${styles.monthItemHeader}`)
        .appendChild(resetButton);
    }

    this.ui.appendChild(mainBlock);

    if (!this.options.autoApply || this.options.footerHTML) {
      this.ui.appendChild(this.renderFooter());
    }

    if (this.options.showTooltip) {
      this.ui.appendChild(this.renderTooltip());
    }

    this.ui.dataset.plugins = (this.options.plugins || []).join('|');

    this.emit('render', this.ui);
  }

  protected renderMonth(date: DateTime, calendarIdx: number) {
    const startDate = date.clone();

    const totalDays = 32 - new Date(startDate.getFullYear(), startDate.getMonth(), 32).getDate();

    const month = document.createElement('div');
    month.className = styles.monthItem;

    const monthHeader = document.createElement('div');
    monthHeader.className = styles.monthItemHeader;

    const monthAndYear = document.createElement('div');

    if (this.options.dropdowns.months) {
      const selectMonths = document.createElement('select');
      selectMonths.className = styles.monthItemName;

      for (let x = 0; x < 12; x += 1) {
        const option = document.createElement('option');
        // day 2 because iOS bug with `toLocaleString`
        // https://github.com/wakirin/Litepicker/issues/113
        const monthName = new DateTime(new Date(date.getFullYear(), x, 2, 0, 0, 0));
        const optionMonth = new DateTime(new Date(date.getFullYear(), x, 1, 0, 0, 0));

        option.value = String(x);
        option.text = monthName.toLocaleString(this.options.lang, { month: 'long' });
        option.disabled = (this.options.minDate
          && optionMonth.isBefore(new DateTime(this.options.minDate), 'month'))
          || (this.options.maxDate && optionMonth.isAfter(new DateTime(this.options.maxDate), 'month'));
        option.selected = optionMonth.getMonth() === date.getMonth();

        selectMonths.appendChild(option);
      }

      selectMonths.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;

        let idx = 0;

        if (this.options.splitView) {
          const monthItem = target.closest(`.${styles.monthItem}`);
          idx = findNestedMonthItem(monthItem);
        }

        this.calendars[idx].setMonth(Number(target.value));
        this.render();

        this.emit('change:month', this.calendars[idx], idx, e);
      });

      monthAndYear.appendChild(selectMonths);
    } else {
      const monthName = document.createElement('strong');
      monthName.className = styles.monthItemName;
      monthName.innerHTML = date.toLocaleString(this.options.lang, { month: 'long' });
      monthAndYear.appendChild(monthName);
    }

    if (this.options.dropdowns.years) {
      const selectYears = document.createElement('select');
      selectYears.className = styles.monthItemYear;

      const minYear = this.options.dropdowns.minYear;
      const maxYear = this.options.dropdowns.maxYear
        ? this.options.dropdowns.maxYear
        : (new Date()).getFullYear();

      if (date.getFullYear() > maxYear) {
        const option = document.createElement('option');
        option.value = String(date.getFullYear());
        option.text = String(date.getFullYear());
        option.selected = true;
        option.disabled = true;

        selectYears.appendChild(option);
      }

      for (let x = maxYear; x >= minYear; x -= 1) {
        const option = document.createElement('option');
        const optionYear = new DateTime(new Date(x, 0, 1, 0, 0, 0));
        option.value = String(x);
        option.text = String(x);
        option.disabled = (this.options.minDate
          && optionYear.isBefore(new DateTime(this.options.minDate), 'year'))
          || (this.options.maxDate
            && optionYear.isAfter(new DateTime(this.options.maxDate), 'year'));
        option.selected = date.getFullYear() === x;

        selectYears.appendChild(option);
      }

      if (date.getFullYear() < minYear) {
        const option = document.createElement('option');
        option.value = String(date.getFullYear());
        option.text = String(date.getFullYear());
        option.selected = true;
        option.disabled = true;

        selectYears.appendChild(option);
      }

      if (this.options.dropdowns.years === 'asc') {
        const childs = Array.prototype.slice.call(selectYears.childNodes);
        const options = childs.reverse();
        selectYears.innerHTML = '';
        options.forEach((y) => {
          y.innerHTML = y.value;
          selectYears.appendChild(y);
        });
      }

      selectYears.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;

        let idx = 0;

        if (this.options.splitView) {
          const monthItem = target.closest(`.${styles.monthItem}`);
          idx = findNestedMonthItem(monthItem);
        }

        this.calendars[idx].setFullYear(Number(target.value));
        this.render();

        this.emit('change:year', this.calendars[idx], idx, e);
      });

      monthAndYear.appendChild(selectYears);
    } else {
      const monthYear = document.createElement('span');
      monthYear.className = styles.monthItemYear;
      monthYear.innerHTML = String(date.getFullYear());
      monthAndYear.appendChild(monthYear);
    }

    const previousYearButton = document.createElement('button');
    previousYearButton.type = 'button';
    previousYearButton.className = styles.buttonPreviousYear;
    previousYearButton.innerHTML = this.options.buttonText.previousYear;

    const previousMonthButton = document.createElement('button');
    previousMonthButton.type = 'button';
    previousMonthButton.className = styles.buttonPreviousMonth;
    previousMonthButton.innerHTML = this.options.buttonText.previousMonth;

    const nextMonthButton = document.createElement('button');
    nextMonthButton.type = 'button';
    nextMonthButton.className = styles.buttonNextMonth;
    nextMonthButton.innerHTML = this.options.buttonText.nextMonth;

    const nextYearButton = document.createElement('button');
    nextYearButton.type = 'button';
    nextYearButton.className = styles.buttonNextYear;
    nextYearButton.innerHTML = this.options.buttonText.nextYear;

    monthHeader.appendChild(previousYearButton);
    monthHeader.appendChild(previousMonthButton);
    monthHeader.appendChild(monthAndYear);
    monthHeader.appendChild(nextMonthButton);
    monthHeader.appendChild(nextYearButton);

    if (this.options.minDate
      && startDate.isSameOrBefore(new DateTime(this.options.minDate), 'month')) {
      month.classList.add(styles.noPreviousMonth);
    }

    if (this.options.maxDate
      && startDate.isSameOrAfter(new DateTime(this.options.maxDate), 'month')) {
      month.classList.add(styles.noNextMonth);
    }

    const weekdaysRow = document.createElement('div');
    weekdaysRow.className = styles.monthItemWeekdaysRow;

    if (this.options.showWeekNumbers) {
      const weekNumbersHeader = document.createElement('div');
      weekNumbersHeader.innerText = this.options.weekNumbersHeader ?? 'W.'
      weekNumbersHeader.className = styles.monthItemWeekNumbersHeader;
      weekdaysRow.appendChild(weekNumbersHeader);
    }

    for (let w = 1; w <= 7; w += 1) {
      // 7 days, 4 is «Thursday» (new Date(1970, 0, 1, 12, 0, 0, 0))
      const dayIdx = 7 - 4 + this.options.firstDay + w;
      const weekday = document.createElement('div');
      weekday.innerHTML = `${this.weekdayName(dayIdx)}.`; // Since this is a shortend name. It should end with dot
      weekday.title = this.weekdayName(dayIdx, 'long');
      weekdaysRow.appendChild(weekday);
    }

    const days = document.createElement('div');
    days.className = styles.containerDays;

    const skipDays = this.calcSkipDays(startDate);

    // tslint:disable-next-line: prefer-for-of
    let renderedWeekDays = 0
    let weekContainer = document.createElement('div')
    weekContainer.className = styles.weekItem;
    for (let idx = 1 - skipDays; idx <= totalDays || (renderedWeekDays > 0 && renderedWeekDays < 7); idx += 1) {
      const wasTimestamp = startDate.getTime()
      startDate.setDate(idx);

      if (this.options.showWeekNumbers && renderedWeekDays == 0) {
        weekContainer.appendChild(this.renderWeekNumber(startDate));
      }

      const rendered = this.renderDay(startDate)
      weekContainer.appendChild(rendered);
      if (idx < 1 || idx > totalDays) {
        rendered.classList.add(styles.adjacentMonthDayItem);
      }
      renderedWeekDays++;
      startDate.setTime(wasTimestamp);
      if (renderedWeekDays == 7) {
        days.appendChild(weekContainer)
        renderedWeekDays = 0;
        weekContainer = document.createElement('div');
        weekContainer.className = styles.weekItem;
      }
    }

    month.appendChild(monthHeader);
    month.appendChild(weekdaysRow);
    month.appendChild(days);

    this.emit('render:month', month, date);

    return month;
  }

  protected renderDay(date: DateTime) {
    date.setHours();

    const day = document.createElement('div');
    day.className = styles.dayItem;
    day.innerHTML = String(date.getDate());
    day.dataset.time = String(date.getTime());

    if (date.toDateString() === (new Date()).toDateString()) {
      day.classList.add(styles.isToday);
    }

    if (this.datePicked.length) {
      if (this.datePicked[0].toDateString() === date.toDateString()) {
        day.classList.add(styles.isStartDate);

        if (this.options.singleMode) {
          day.classList.add(styles.isEndDate);
        }
      }

      if (this.datePicked.length === 2
        && this.datePicked[1].toDateString() === date.toDateString()) {
        day.classList.add(styles.isEndDate);
      }

      if (this.datePicked.length === 2) {
        if (date.isBetween(this.datePicked[0], this.datePicked[1])) {
          day.classList.add(styles.isInRange);
        }
      }
    } else if (this.options.startDate) {
      const startDate = this.options.startDate as DateTime;
      const endDate = this.options.endDate as DateTime;

      if (startDate.toDateString() === date.toDateString()) {
        day.classList.add(styles.isStartDate);

        if (this.options.singleMode) {
          day.classList.add(styles.isEndDate);
        }
      }

      if (endDate && endDate.toDateString() === date.toDateString()) {
        day.classList.add(styles.isEndDate);
      }

      if (startDate && endDate) {
        if (date.isBetween(startDate, endDate)) {
          day.classList.add(styles.isInRange);
        }
      }
    }

    if (this.options.minDate && date.isBefore(new DateTime(this.options.minDate))) {
      day.classList.add(styles.isLocked);
    }

    if (this.options.maxDate && date.isAfter(new DateTime(this.options.maxDate))) {
      day.classList.add(styles.isLocked);
    }

    if (this.options.minDays > 1
      && this.datePicked.length === 1) {
      const minDays = this.options.minDays - 1; // subtract selected day
      const left = this.datePicked[0].clone().subtract(minDays, 'day');
      const right = this.datePicked[0].clone().add(minDays, 'day');

      if (date.isBetween(left, this.datePicked[0], '(]')) {
        day.classList.add(styles.isLocked);
      }

      if (date.isBetween(this.datePicked[0], right, '[)')) {
        day.classList.add(styles.isLocked);
      }
    }

    if (this.options.maxDays
      && this.datePicked.length === 1) {
      const maxDays = this.options.maxDays;
      const left = this.datePicked[0].clone().subtract(maxDays, 'day');
      const right = this.datePicked[0].clone().add(maxDays, 'day');

      if (date.isSameOrBefore(left)) {
        day.classList.add(styles.isLocked);
      }

      if (date.isSameOrAfter(right)) {
        day.classList.add(styles.isLocked);
      }
    }

    if (this.options.selectForward
      && this.datePicked.length === 1
      && date.isBefore(this.datePicked[0])) {
      day.classList.add(styles.isLocked);
    }

    if (this.options.selectBackward
      && this.datePicked.length === 1
      && date.isAfter(this.datePicked[0])) {
      day.classList.add(styles.isLocked);
    }

    const locked = dateIsLocked(date, this.options, this.datePicked);

    if (locked) {
      day.classList.add(styles.isLocked);
    }

    if (this.options.highlightedDays.length) {
      const isHighlighted = this.options.highlightedDays
        .filter((d) => {
          if (d instanceof Array) {
            return date.isBetween(d[0], d[1], '[]');
          }

          return d.isSame(date, 'day');
        }).length;

      if (isHighlighted) {
        day.classList.add(styles.isHighlighted);
      }
    }

    // fix bug iOS 10-12 - https://github.com/wakirin/Litepicker/issues/124
    day.tabIndex = !day.classList.contains('is-locked') ? 0 : -1;

    this.emit('render:day', day, date);

    return day;
  }

  protected renderFooter() {
    const footer = document.createElement('div');
    footer.className = styles.containerFooter;

    if (this.options.footerHTML) {
      footer.innerHTML = this.options.footerHTML;
    } else {
      footer.innerHTML = `
      <span class="${styles.previewDateRange}"></span>
      <button type="button" class="${styles.buttonCancel}">${this.options.buttonText.cancel}</button>
      <button type="button" class="${styles.buttonApply}">${this.options.buttonText.apply}</button>
      `;
    }

    if (this.options.singleMode) {
      if (this.datePicked.length === 1) {
        const startValue = this.datePicked[0].format(this.options.format, this.options.lang);
        footer.querySelector(`.${styles.previewDateRange}`).innerHTML = startValue;
      }
    } else {
      if (this.datePicked.length === 1) {
        footer.querySelector(`.${styles.buttonApply}`).setAttribute('disabled', '');
      }

      if (this.datePicked.length === 2) {
        const startValue = this.datePicked[0].format(this.options.format, this.options.lang);
        const endValue = this.datePicked[1].format(this.options.format, this.options.lang);

        footer.querySelector(`.${styles.previewDateRange}`)
          .innerHTML = `${startValue}${this.options.delimiter}${endValue}`;
      }
    }

    this.emit('render:footer', footer);

    return footer;
  }

  protected renderWeekNumber(date: DateTime) {
    const wn = document.createElement('div');
    const week = date.getWeek();
    wn.className = styles.weekNumber;
    wn.innerHTML = String(week);
    wn.dataset.time = String(date.getTime());
    return wn;
  }

  protected renderTooltip() {
    const t = document.createElement('div');
    t.className = styles.containerTooltip;

    return t;
  }

  private weekdayName(day, representation = 'short') {
    return new Date(1970, 0, day, 12, 0, 0, 0)
      .toLocaleString(this.options.lang, { weekday: representation });
  }

  private calcSkipDays(date) {
    let total = date.getDay() - this.options.firstDay;
    if (total < 0) total += 7;

    return total;
  }

  protected startOfWeek(date: Date): Date {
    const d = new Date(date.getTime())
    const day = d.getDay() == 0 ? 6 : d.getDay() - this.options.firstDay
    d.setDate(d.getDate() - day)
    return startOfDay(d)
  }

  protected endOfWeek(date: Date): Date {
    const d = new Date(date.getTime())
    const day = d.getDay() == 0 ? 6 : d.getDay() - this.options.firstDay
    d.setDate(d.getDate() + 6 - day)
    return endOfDay(d)
  }
}
