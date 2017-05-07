import { Component, forwardRef, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormControl, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { FormlyFieldConfig } from 'ng-formly';
import { FormlyDesignerConfig } from '../formly-designer-config';
import { Observable, Subscription } from 'rxjs/Rx';


const FIELD_EDITOR_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FieldEditorComponent),
    multi: true
};

@Component({
    selector: 'field-editor',
    template: `
        <form [formGroup]="form" novalidate>
            <div class="card">
                <div class="card-header">
                    <div class="form-group">
                        <label>key</label>
                        <input formControlName="key" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>type</label>
                        <type-select formControlName="type"></type-select>
                    </div>
                </div>
                <div class="card-block">
                    <formly-form [form]="fieldForm" [fields]="type.value | typeFields" [model]="field">
                    </formly-form>
                    <ng-content></ng-content>
                </div>
            </div>
        </form>
    `,
    providers: [
        FIELD_EDITOR_CONTROL_VALUE_ACCESSOR
    ]
})
export class FieldEditorComponent implements ControlValueAccessor, OnChanges, OnDestroy, OnInit {
    @Input()
    field: FormlyFieldConfig = {};

    @Output()
    invalid: boolean;

    constructor(
        private formBuilder: FormBuilder,
        private formlyDesignerConfig: FormlyDesignerConfig
    ) {
        this.form = formBuilder.group({
            key: ["", Validators.compose([Validators.required, Validators.pattern(/^\s*\S.*$/)])],
            type: ["", Validators.compose([Validators.required, Validators.pattern(/^\s*\S.*$/)])]
        });
        this.fieldForm = formBuilder.group({});
    }

    get key(): FormControl {
        return this.form.get("key") as FormControl;
    }

    get type(): FormControl {
        return this.form.get("type") as FormControl;
    }

    form: FormGroup;
    fieldForm: FormGroup;
    protected onChange = (value: any) => { };
    protected onTouched = () => { };

    private formStatusChangesSubscription: Subscription;
    private typeChangesSubscription: Subscription;
    private valueChangesSubscription: Subscription;

    ngOnInit(): void {
        this.typeChangesSubscription = this.type.valueChanges
            .subscribe(() => this.onTypeChange());

        this.formStatusChangesSubscription = this.form.statusChanges
            .switchMap(() => Observable.timer())
            .subscribe(() => this.invalid = this.form.invalid);

        this.valueChangesSubscription = Observable.merge(this.fieldForm.valueChanges, this.form.valueChanges)
            .switchMap(() => Observable.timer())
            .subscribe(() => this.updateValue());
    }

    ngOnDestroy(): void {
        this.formStatusChangesSubscription.unsubscribe();
        this.typeChangesSubscription.unsubscribe();
        this.valueChangesSubscription.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["field"]) {
            let subscription = this.typeChangesSubscription;
            if (subscription) {
                this.typeChangesSubscription.unsubscribe();
            }

            let field = this.field ? this.field : { };
            let key = field.key || "";
            let type = field.type || "";
            this.key.setValue(key);
            this.type.setValue(type);
            if (subscription) {
                this.typeChangesSubscription = this.type.valueChanges.subscribe(this.onTypeChange.bind(this));
            }
        }
    }

    writeValue(obj: any) {
        let changed = false;
        let onChange = this.onChange;
        this.onChange = undefined;

        if (!obj) {
            obj = { key: "", type: "" };
            changed = true;
        }
        else if (!("key" in obj) || !("type" in obj)) {
            obj = { key: "key" in obj ? obj.key : "", type: "type" in obj ? obj.type : "" };
            changed = true;
        }

        this.field = obj;
        this.form.setValue(obj);
        this.fieldForm = this.formBuilder.group({});

        this.onChange = onChange;
        if (changed && onChange) {
            Observable.timer().subscribe(() => {
                onChange(obj);
            });
        }
    }

    registerOnChange(fn: any) {
        this.onChange = fn;
    }

    registerOnTouched(fn: any) {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.form.disable();
        }
        else {
            this.form.enable();
        }
    }

    private updateValue(): void {
        if (!this.onChange) {
            return;
        }

        this.field.key = this.key.value;
        this.field.type = this.type.value;
        this.onChange(this.field);
    }

    private onTypeChange(): void {
        this.fieldForm = this.formBuilder.group({});
        this.field = { key: this.key.value, type: this.type.value } as any;
    }
}